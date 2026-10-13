import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import { IDENTIFIER_SHORT_LABELS } from "@/lib/master-data-labels";
import {
  compactIdentifiers,
  searchSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  type IdentifierMap,
} from "@/lib/validation/master-data";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import { auditEvents, suppliers } from "@/server/db/schema";
import { DomainError, notFound, staleVersion, type DuplicateMatch } from "@/server/errors";
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

type Replayable<T> = T & { replayed: boolean };

const ENTITY = "supplier";

const supplierHash = (row: Record<string, unknown>) =>
  sha256Hex(
    canonicalJson({
      legalName: row.legalName,
      country: row.country,
      identifiers: row.identifiers,
      address: row.address,
      city: row.city,
      invoiceReferenceNote: row.invoiceReferenceNote,
      active: row.active,
    }),
  );

async function findSupplierDuplicates(
  tx: Tx,
  input: { legalName: string; country: string; identifiers: IdentifierMap },
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const nameKey = normalizeName(input.legalName);
  const identifierMatches = Object.entries(input.identifiers)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([type, value]) => sql`${suppliers.identifiers} ->> ${type} = ${value}`);
  const rows = await tx
    .select({
      id: suppliers.id,
      legalName: suppliers.legalName,
      country: suppliers.country,
      identifiers: suppliers.identifiers,
    })
    .from(suppliers)
    .where(
      and(
        excludeId ? ne(suppliers.id, excludeId) : undefined,
        or(sql`${normalizedSql(suppliers.legalName)} = ${nameKey}`, ...identifierMatches),
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

/** P-11. Kosovo or Albania; invoices always in EUR (CHECK currency = 'EUR'). */
export async function createSupplier(
  db: Db,
  actor: Actor,
  raw: z.input<typeof supplierCreateSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ supplierId: string }>> {
  authorize(actor, "P-11");
  const parsed = parseOrThrow(supplierCreateSchema, raw);
  const input = { ...parsed, identifiers: compactIdentifiers(parsed.identifiers) };

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "supplier.create",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { supplierId: claim.resultId!, replayed: true };
    await assertActorActive(tx, actor);

    assertDuplicatesAcknowledged(
      await findSupplierDuplicates(tx, input),
      input.acknowledgedDuplicateIds,
    );
    const values = {
      legalName: input.legalName,
      country: input.country,
      identifiers: input.identifiers,
      address: input.address,
      city: input.city,
      invoiceReferenceNote: input.invoiceReferenceNote,
      active: input.active,
    };
    const [row] = await tx
      .insert(suppliers)
      .values({ orgId: actor.orgId, currency: "EUR", ...values })
      .returning({ id: suppliers.id });
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "supplier.create",
      entityType: ENTITY,
      entityId: row!.id,
      idempotencyKey,
      afterHash: supplierHash(values),
      details: {
        country: input.country,
        identifierTypes: Object.keys(input.identifiers),
        duplicatesAcknowledged: input.acknowledgedDuplicateIds.length,
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "SUPPLIER", resultId: row!.id });
    return { supplierId: row!.id, replayed: false };
  });
}

export async function updateSupplier(
  db: Db,
  actor: Actor,
  raw: z.input<typeof supplierUpdateSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ supplierId: string; version: number }>> {
  authorize(actor, "P-11");
  const parsed = parseOrThrow(supplierUpdateSchema, raw);
  const input = { ...parsed, identifiers: compactIdentifiers(parsed.identifiers) };

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "supplier.update",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      const [row] = await tx
        .select({ version: suppliers.version })
        .from(suppliers)
        .where(eq(suppliers.id, input.supplierId));
      return { supplierId: input.supplierId, version: row?.version ?? 0, replayed: true };
    }
    await assertActorActive(tx, actor);

    const [current] = await tx
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, input.supplierId))
      .for("update");
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw staleVersion();

    const next = {
      legalName: input.legalName,
      country: input.country,
      identifiers: input.identifiers,
      address: input.address,
      city: input.city,
      invoiceReferenceNote: input.invoiceReferenceNote,
      active: input.active,
    };
    const changed = changedFields(current as Record<string, unknown>, next);
    if (changed.length === 0) {
      throw new DomainError("NO_CHANGES", "Nuk ka ndryshime për t'u ruajtur.", 422);
    }
    if (changed.some((field) => ["legalName", "country", "identifiers"].includes(field))) {
      assertDuplicatesAcknowledged(
        await findSupplierDuplicates(tx, input, current.id),
        input.acknowledgedDuplicateIds,
      );
    }
    const [updated] = await tx
      .update(suppliers)
      .set({ ...next, version: sql`${suppliers.version} + 1`, updatedAt: sql`now()` })
      .where(and(eq(suppliers.id, current.id), eq(suppliers.version, input.expectedVersion)))
      .returning({ version: suppliers.version });
    if (!updated) throw staleVersion();
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "supplier.update",
      entityType: ENTITY,
      entityId: current.id,
      idempotencyKey,
      beforeHash: supplierHash(current),
      afterHash: supplierHash(next),
      details: {
        changed,
        ...(changed.includes("country")
          ? { countryFrom: current.country, countryTo: next.country }
          : {}),
        ...(changed.includes("active") ? { active: next.active } : {}),
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "SUPPLIER", resultId: current.id });
    return { supplierId: current.id, version: updated.version, replayed: false };
  });
}

export interface SupplierListItem {
  id: string;
  legalName: string;
  country: string;
  identifiers: IdentifierMap;
  city: string | null;
  active: boolean;
}

export async function searchSuppliers(
  db: Db,
  actor: Actor,
  raw: z.input<typeof searchSchema>,
): Promise<SupplierListItem[]> {
  authorize(actor, "P-16");
  const input = parseOrThrow(searchSchema, raw);
  const normalized = normalizeName(input.q);
  const nameKey = `%${likeEscape(normalized)}%`;
  const idPrefix = `${likeEscape(input.q.replace(/\s+/g, "").toUpperCase())}%`;
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const rows = await tx
      .select({
        id: suppliers.id,
        legalName: suppliers.legalName,
        country: suppliers.country,
        identifiers: suppliers.identifiers,
        city: suppliers.city,
        active: suppliers.active,
      })
      .from(suppliers)
      .where(
        and(
          input.includeInactive ? undefined : eq(suppliers.active, true),
          input.q === ""
            ? undefined
            : or(
                normalized ? sql`${normalizedSql(suppliers.legalName)} like ${nameKey}` : undefined,
                sql`exists (select 1 from jsonb_each_text(${suppliers.identifiers}) i where i.value like ${idPrefix})`,
              ),
        ),
      )
      .orderBy(suppliers.legalName)
      .limit(input.limit);
    return rows.map((row) => ({ ...row, identifiers: row.identifiers as IdentifierMap }));
  });
}

export async function getSupplier(db: Db, actor: Actor, supplierId: string) {
  authorize(actor, "P-16");
  if (!z.uuid().safeParse(supplierId).success) throw notFound();
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierId));
    if (!supplier) throw notFound();
    const history = await tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        action: auditEvents.action,
        actorRole: auditEvents.actorRole,
        details: auditEvents.safeDetails,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, ENTITY), eq(auditEvents.entityId, supplierId)))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(30);
    return {
      supplier: { ...supplier, identifiers: supplier.identifiers as IdentifierMap },
      history,
    };
  });
}
