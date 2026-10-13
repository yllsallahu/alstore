import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { kosovoToday } from "@/lib/dates";
import { IDENTIFIER_SHORT_LABELS, type VerificationState } from "@/lib/master-data-labels";
import {
  compactIdentifiers,
  customerCreateSchema,
  customerUpdateSchema,
  manualVerificationSchema,
  searchSchema,
  suspensionSchema,
  type IdentifierMap,
} from "@/lib/validation/master-data";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import {
  auditEvents,
  customerVerifications,
  customers,
  documentFiles,
  documentLinks,
  releaseGates,
} from "@/server/db/schema";
import {
  DomainError,
  ValidationError,
  notFound,
  staleVersion,
  type DuplicateMatch,
} from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { canonicalJson, requestHash, sha256Hex } from "@/server/lib/canonical-hash";

import {
  assertDuplicatesAcknowledged,
  changedFields,
  likeEscape,
  mergeMatches,
  normalizeName,
  normalizedSql,
  parseOrThrow,
} from "./common";
import { activeRules, checkAgainstRules, formatCheckPasses } from "./identifier-rules";
import {
  INVOICEABLE_STATES,
  customerIdentityHash,
  deriveVerification,
  type DerivedVerification,
  type VerificationEvent,
} from "./verification-state";

type Replayable<T> = T & { replayed: boolean };

const ENTITY = "customer";
/** Gate whose accountant procedure memo defines acceptable buyer verification (OLD-14). */
export const BUYER_VERIFICATION_GATE = "VG-07";

/** Identifier values are business data: audit rows carry hashes and field names, never values. */
const customerHash = (row: Record<string, unknown>) =>
  sha256Hex(
    canonicalJson({
      legalName: row.legalName,
      identifiers: row.identifiers,
      address: row.address,
      city: row.city,
      active: row.active,
    }),
  );

async function findCustomerDuplicates(
  tx: Tx,
  input: { legalName: string; identifiers: IdentifierMap },
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const nameKey = normalizeName(input.legalName);
  const identifierMatches = Object.entries(input.identifiers)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([type, value]) => sql`${customers.identifiers} ->> ${type} = ${value}`);
  const rows = await tx
    .select({
      id: customers.id,
      legalName: customers.legalName,
      identifiers: customers.identifiers,
    })
    .from(customers)
    .where(
      and(
        excludeId ? ne(customers.id, excludeId) : undefined,
        or(sql`${normalizedSql(customers.legalName)} = ${nameKey}`, ...identifierMatches),
      ),
    )
    .limit(10);
  const matches: DuplicateMatch[] = [];
  for (const row of rows) {
    const theirs = row.identifiers as IdentifierMap;
    for (const [type, value] of Object.entries(input.identifiers)) {
      if (value && theirs[type] === value) {
        matches.push({
          id: row.id,
          label: row.legalName,
          reason: `I njëjti ${IDENTIFIER_SHORT_LABELS[type as keyof typeof IDENTIFIER_SHORT_LABELS] ?? type}`,
        });
      }
    }
    if (normalizeName(row.legalName) === nameKey) {
      matches.push({ id: row.id, label: row.legalName, reason: "Emër ligjor i njëjtë" });
    }
  }
  return mergeMatches(matches);
}

async function assertRules(tx: Tx, identifiers: IdentifierMap) {
  const rules = await activeRules(tx);
  const errors = checkAgainstRules(identifiers, rules);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return rules;
}

/** Records an automatic FORMAT_CHECK when every entered identifier has a rule and passes it. */
async function recordFormatCheck(
  tx: Tx,
  actor: Actor,
  customerId: string,
  identityHash: string,
  identifiers: IdentifierMap,
  rules: Awaited<ReturnType<typeof activeRules>>,
) {
  if (!formatCheckPasses(identifiers, rules)) return false;
  await tx.insert(customerVerifications).values({
    orgId: actor.orgId,
    customerId,
    method: "FORMAT_CHECK",
    result: "PASSED",
    identityHash,
    note: null,
    verifiedBy: actor.userId,
  });
  return true;
}

/** P-11. A registered business: legal name + at least one business identifier. */
export async function createCustomer(
  db: Db,
  actor: Actor,
  raw: z.input<typeof customerCreateSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ customerId: string }>> {
  authorize(actor, "P-11");
  const parsed = parseOrThrow(customerCreateSchema, raw);
  const input = { ...parsed, identifiers: compactIdentifiers(parsed.identifiers) };

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "customer.create",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { customerId: claim.resultId!, replayed: true };
    await assertActorActive(tx, actor);

    const rules = await assertRules(tx, input.identifiers);
    assertDuplicatesAcknowledged(
      await findCustomerDuplicates(tx, input),
      input.acknowledgedDuplicateIds,
    );

    const values = {
      legalName: input.legalName,
      identifiers: input.identifiers,
      address: input.address,
      city: input.city,
      active: input.active,
    };
    const [row] = await tx
      .insert(customers)
      .values({ orgId: actor.orgId, ...values })
      .returning({ id: customers.id });
    const formatValid = await recordFormatCheck(
      tx,
      actor,
      row!.id,
      customerIdentityHash(input.legalName, input.identifiers),
      input.identifiers,
      rules,
    );
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "customer.create",
      entityType: ENTITY,
      entityId: row!.id,
      idempotencyKey,
      afterHash: customerHash(values),
      details: {
        identifierTypes: Object.keys(input.identifiers),
        formatCheck: formatValid ? "PASSED" : "NOT_CLAIMED",
        duplicatesAcknowledged: input.acknowledgedDuplicateIds.length,
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "CUSTOMER", resultId: row!.id });
    return { customerId: row!.id, replayed: false };
  });
}

/**
 * P-11. Changing the legal name or an identifier changes the identity hash, so earlier
 * verifications stop counting and the customer must be verified again.
 */
export async function updateCustomer(
  db: Db,
  actor: Actor,
  raw: z.input<typeof customerUpdateSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ customerId: string; version: number; identityChanged: boolean }>> {
  authorize(actor, "P-11");
  const parsed = parseOrThrow(customerUpdateSchema, raw);
  const input = { ...parsed, identifiers: compactIdentifiers(parsed.identifiers) };

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "customer.update",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      const [row] = await tx
        .select({ version: customers.version })
        .from(customers)
        .where(eq(customers.id, input.customerId));
      return {
        customerId: input.customerId,
        version: row?.version ?? 0,
        identityChanged: false,
        replayed: true,
      };
    }
    await assertActorActive(tx, actor);

    const [current] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .for("update");
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw staleVersion();

    const next = {
      legalName: input.legalName,
      identifiers: input.identifiers,
      address: input.address,
      city: input.city,
      active: input.active,
    };
    const changed = changedFields(current as Record<string, unknown>, next);
    if (changed.length === 0) {
      throw new DomainError("NO_CHANGES", "Nuk ka ndryshime për t'u ruajtur.", 422);
    }
    const identityChanged = changed.includes("legalName") || changed.includes("identifiers");
    let rules: Awaited<ReturnType<typeof activeRules>> = [];
    if (identityChanged) {
      rules = await assertRules(tx, input.identifiers);
      assertDuplicatesAcknowledged(
        await findCustomerDuplicates(tx, input, current.id),
        input.acknowledgedDuplicateIds,
      );
    }

    const [updated] = await tx
      .update(customers)
      .set({ ...next, version: sql`${customers.version} + 1`, updatedAt: sql`now()` })
      .where(and(eq(customers.id, current.id), eq(customers.version, input.expectedVersion)))
      .returning({ version: customers.version });
    if (!updated) throw staleVersion();

    let formatValid = false;
    if (identityChanged) {
      formatValid = await recordFormatCheck(
        tx,
        actor,
        current.id,
        customerIdentityHash(input.legalName, input.identifiers),
        input.identifiers,
        rules,
      );
    }
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "customer.update",
      entityType: ENTITY,
      entityId: current.id,
      idempotencyKey,
      beforeHash: customerHash(current),
      afterHash: customerHash(next),
      details: {
        changed,
        identityChanged,
        ...(identityChanged ? { formatCheck: formatValid ? "PASSED" : "NOT_CLAIMED" } : {}),
        ...(changed.includes("active") ? { active: next.active } : {}),
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "CUSTOMER", resultId: current.id });
    return { customerId: current.id, version: updated.version, identityChanged, replayed: false };
  });
}

async function loadEvents(tx: Tx, customerIds: string[]) {
  if (customerIds.length === 0) return new Map<string, VerificationEvent[]>();
  const rows = await tx
    .select({
      customerId: customerVerifications.customerId,
      method: customerVerifications.method,
      result: customerVerifications.result,
      identityHash: customerVerifications.identityHash,
      verifiedAt: customerVerifications.verifiedAt,
      validUntil: customerVerifications.validUntil,
    })
    .from(customerVerifications)
    .where(inArray(customerVerifications.customerId, customerIds));
  const byCustomer = new Map<string, VerificationEvent[]>();
  for (const row of rows) {
    const list = byCustomer.get(row.customerId) ?? [];
    list.push(row);
    byCustomer.set(row.customerId, list);
  }
  return byCustomer;
}

export interface Eligibility {
  eligible: boolean;
  state: VerificationState;
  reasons: { code: string; message: string }[];
}

/**
 * Issuance guard for Phases 07–08 (CMD-02 step 4): only an active customer, verified in a state
 * permitted under an APPROVED VG-07, may receive an issued tax invoice. Fails closed.
 * With `lock`, the customer row is held FOR SHARE until the caller's transaction ends.
 */
export async function getCustomerInvoiceEligibility(
  tx: Tx,
  customerId: string,
  options: { lock?: boolean; today?: string } = {},
): Promise<Eligibility> {
  const query = tx.select().from(customers).where(eq(customers.id, customerId));
  const [customer] = options.lock ? await query.for("share") : await query;
  if (!customer) throw notFound();
  const events = (await loadEvents(tx, [customerId])).get(customerId) ?? [];
  const derived = deriveVerification(
    events,
    customerIdentityHash(customer.legalName, customer.identifiers as IdentifierMap),
    options.today ?? kosovoToday(),
  );
  const [gate] = await tx
    .select({ status: releaseGates.status })
    .from(releaseGates)
    .where(eq(releaseGates.gateKey, BUYER_VERIFICATION_GATE));

  const reasons: Eligibility["reasons"] = [];
  if (!customer.active) {
    reasons.push({ code: "CUSTOMER_INACTIVE", message: "Klienti është jo aktiv." });
  }
  if (derived.state === "SUSPENDED") {
    reasons.push({ code: "SUSPENDED", message: "Verifikimi i klientit është pezulluar." });
  } else if (!INVOICEABLE_STATES.includes(derived.state)) {
    reasons.push({
      code: derived.expired ? "VERIFICATION_EXPIRED" : "NOT_VERIFIED",
      message: derived.expired
        ? "Verifikimi manual ka skaduar. Verifikojeni klientin përsëri."
        : derived.staleAfterIdentityChange
          ? "Emri ligjor ose numrat identifikues kanë ndryshuar pas verifikimit. Verifikojeni klientin përsëri."
          : "Klienti nuk është verifikuar manualisht me dëshmi.",
    });
  }
  if (gate?.status !== "APPROVED") {
    reasons.push({
      code: "VG07_NOT_APPROVED",
      message:
        "Procedura e verifikimit të blerësve (VG-07) nuk është miratuar ende nga kontabilisti.",
    });
  }
  return { eligible: reasons.length === 0, state: derived.state, reasons };
}

export interface CustomerListItem {
  id: string;
  legalName: string;
  identifiers: IdentifierMap;
  city: string | null;
  active: boolean;
  verification: DerivedVerification["state"];
  billingIncomplete: boolean;
}

/** P-16. Name contains (ë/ç-insensitive) or identifier prefix. */
export async function searchCustomers(
  db: Db,
  actor: Actor,
  raw: z.input<typeof searchSchema>,
): Promise<CustomerListItem[]> {
  authorize(actor, "P-16");
  const input = parseOrThrow(searchSchema, raw);
  const normalized = normalizeName(input.q);
  const nameKey = `%${likeEscape(normalized)}%`;
  const idPrefix = `${likeEscape(input.q.replace(/\s+/g, "").toUpperCase())}%`;
  const today = kosovoToday();

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const rows = await tx
      .select()
      .from(customers)
      .where(
        and(
          input.includeInactive ? undefined : eq(customers.active, true),
          input.q === ""
            ? undefined
            : or(
                normalized ? sql`${normalizedSql(customers.legalName)} like ${nameKey}` : undefined,
                sql`exists (select 1 from jsonb_each_text(${customers.identifiers}) i where i.value like ${idPrefix})`,
              ),
        ),
      )
      .orderBy(customers.legalName)
      .limit(input.limit);
    const events = await loadEvents(
      tx,
      rows.map((row) => row.id),
    );
    return rows.map((row) => {
      const identifiers = row.identifiers as IdentifierMap;
      return {
        id: row.id,
        legalName: row.legalName,
        identifiers,
        city: row.city,
        active: row.active,
        verification: deriveVerification(
          events.get(row.id) ?? [],
          customerIdentityHash(row.legalName, identifiers),
          today,
        ).state,
        billingIncomplete: !row.address || !row.city,
      };
    });
  });
}

export async function getCustomer(db: Db, actor: Actor, customerId: string) {
  authorize(actor, "P-16");
  if (!z.uuid().safeParse(customerId).success) throw notFound();
  const today = kosovoToday();
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) throw notFound();
    const verifications = await tx
      .select()
      .from(customerVerifications)
      .where(eq(customerVerifications.customerId, customerId))
      .orderBy(desc(customerVerifications.verifiedAt));
    const identityHash = customerIdentityHash(
      customer.legalName,
      customer.identifiers as IdentifierMap,
    );
    const derived = deriveVerification(verifications, identityHash, today);
    const eligibility = await getCustomerInvoiceEligibility(tx, customerId, { today });
    const history = await tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        action: auditEvents.action,
        actorRole: auditEvents.actorRole,
        details: auditEvents.safeDetails,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, ENTITY), eq(auditEvents.entityId, customerId)))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(30);
    return {
      customer: { ...customer, identifiers: customer.identifiers as IdentifierMap },
      identityHash,
      derived,
      eligibility,
      verifications: verifications.map((v) => ({ ...v, current: v.identityHash === identityHash })),
      history,
    };
  });
}

async function lockCustomer(tx: Tx, customerId: string) {
  const [customer] = await tx
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .for("update");
  if (!customer) throw notFound();
  return customer;
}

async function currentState(tx: Tx, customer: typeof customers.$inferSelect) {
  const events = (await loadEvents(tx, [customer.id])).get(customer.id) ?? [];
  const identityHash = customerIdentityHash(
    customer.legalName,
    customer.identifiers as IdentifierMap,
  );
  return { identityHash, derived: deriveVerification(events, identityHash, kosovoToday()) };
}

/**
 * P-12 (CMD-23). Manual verification against a stored evidence document (e.g. the business
 * registration certificate). Which evidence suffices is decided under VG-07.
 */
export async function recordManualVerification(
  db: Db,
  actor: Actor,
  raw: z.input<typeof manualVerificationSchema>,
  idempotencyKey: string,
) {
  authorize(actor, "P-12");
  const input = parseOrThrow(manualVerificationSchema, raw);
  if (input.validUntil && input.validUntil < kosovoToday()) {
    throw new ValidationError({
      validUntil: "Data e vlefshmërisë nuk mund të jetë në të kaluarën.",
    });
  }

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "customer.verify_manual",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { verificationId: claim.resultId!, replayed: true };
    await assertActorActive(tx, actor);

    const customer = await lockCustomer(tx, input.customerId);
    const { identityHash, derived } = await currentState(tx, customer);
    if (derived.state === "SUSPENDED") {
      throw new DomainError(
        "CUSTOMER_SUSPENDED",
        "Klienti është i pezulluar. Hiqni pezullimin para një verifikimi të ri.",
        409,
      );
    }
    const [document] = await tx
      .select({ id: documentFiles.id, status: documentFiles.status })
      .from(documentFiles)
      .where(eq(documentFiles.id, input.evidenceDocumentId));
    if (!document || document.status === "ORPHANED") {
      throw new ValidationError({
        evidenceDocumentId: "Dokumenti i dëshmisë nuk u gjet. Ngarkojeni përsëri.",
      });
    }

    const [row] = await tx
      .insert(customerVerifications)
      .values({
        orgId: actor.orgId,
        customerId: customer.id,
        method: "MANUAL_EVIDENCE",
        result: input.result,
        evidenceDocumentId: document.id,
        note: input.note,
        identityHash,
        verifiedBy: actor.userId,
        validUntil: input.validUntil,
      })
      .returning({ id: customerVerifications.id });
    await tx
      .insert(documentLinks)
      .values({
        orgId: actor.orgId,
        documentId: document.id,
        entityType: ENTITY,
        entityId: customer.id,
        role: "VERIFICATION_EVIDENCE",
        createdBy: actor.userId,
      })
      .onConflictDoNothing();
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "customer.verify_manual",
      entityType: ENTITY,
      entityId: customer.id,
      idempotencyKey,
      details: {
        result: input.result,
        verificationId: row!.id,
        evidenceDocumentId: document.id,
        validUntil: input.validUntil,
        previousState: derived.state,
      },
    });
    await completeIdempotencyKey(tx, claim.id, {
      resultType: "CUSTOMER_VERIFICATION",
      resultId: row!.id,
    });
    return { verificationId: row!.id, replayed: false };
  });
}

async function recordSuspension(
  db: Db,
  actor: Actor,
  raw: z.input<typeof suspensionSchema>,
  idempotencyKey: string,
  method: "SUSPENSION" | "REINSTATEMENT",
) {
  authorize(actor, "P-13");
  const input = parseOrThrow(suspensionSchema, raw);
  const operation = method === "SUSPENSION" ? "customer.suspend" : "customer.reinstate";

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation,
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { verificationId: claim.resultId!, replayed: true };
    await assertActorActive(tx, actor);

    // FOR UPDATE conflicts with the FOR SHARE taken by issuance: a suspension waits for an
    // in-flight issuance to finish, and an issuance after it sees the suspension (SCOPE.md).
    const customer = await lockCustomer(tx, input.customerId);
    const { identityHash, derived } = await currentState(tx, customer);
    if (method === "SUSPENSION" && derived.state === "SUSPENDED") {
      throw new DomainError("ALREADY_SUSPENDED", "Klienti është tashmë i pezulluar.", 409);
    }
    if (method === "REINSTATEMENT" && derived.state !== "SUSPENDED") {
      throw new DomainError("NOT_SUSPENDED", "Klienti nuk është i pezulluar.", 409);
    }
    const [row] = await tx
      .insert(customerVerifications)
      .values({
        orgId: actor.orgId,
        customerId: customer.id,
        method,
        result: "PASSED",
        note: input.reason,
        identityHash,
        verifiedBy: actor.userId,
      })
      .returning({ id: customerVerifications.id });
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: operation,
      entityType: ENTITY,
      entityId: customer.id,
      idempotencyKey,
      details: { verificationId: row!.id, previousState: derived.state },
    });
    await completeIdempotencyKey(tx, claim.id, {
      resultType: "CUSTOMER_VERIFICATION",
      resultId: row!.id,
    });
    return { verificationId: row!.id, replayed: false };
  });
}

/** P-13. Takes effect immediately, including for open drafts (re-checked at issuance). */
export const suspendCustomer = (
  db: Db,
  actor: Actor,
  raw: z.input<typeof suspensionSchema>,
  key: string,
) => recordSuspension(db, actor, raw, key, "SUSPENSION");

/** P-13. Lifts the suspension; the customer is UNVERIFIED until verified again. */
export const reinstateCustomer = (
  db: Db,
  actor: Actor,
  raw: z.input<typeof suspensionSchema>,
  key: string,
) => recordSuspension(db, actor, raw, key, "REINSTATEMENT");
