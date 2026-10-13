import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";

import { IDENTIFIER_LABELS } from "@/lib/master-data-labels";
import { formatRuleSchema } from "@/lib/validation/master-data";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import { identifierFormatRules } from "@/server/db/schema";
import { DomainError, notFound } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash } from "@/server/lib/canonical-hash";

import { parseOrThrow } from "./common";

export type FormatRule = typeof identifierFormatRules.$inferSelect;

export async function activeRules(tx: Tx): Promise<FormatRule[]> {
  return tx.select().from(identifierFormatRules).where(eq(identifierFormatRules.status, "ACTIVE"));
}

/** Field errors for values that break an ACTIVE rule, and for required identifiers left empty. */
export function checkAgainstRules(
  identifiers: Record<string, string | null | undefined>,
  rules: FormatRule[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const rule of rules) {
    const value = identifiers[rule.identifierType];
    const key = `identifiers.${rule.identifierType}`;
    if (!value) {
      if (rule.required) errors[key] = "Ky numër kërkohet sipas rregullave të kontabilistit.";
      continue;
    }
    if (rule.digitsOnly && !/^\d+$/.test(value)) {
      errors[key] = "Sipas rregullave të kontabilistit lejohen vetëm shifra.";
    } else if (value.length < rule.minLength || value.length > rule.maxLength) {
      errors[key] =
        rule.minLength === rule.maxLength
          ? `Sipas rregullave të kontabilistit duhet të ketë ${rule.minLength} shenja.`
          : `Sipas rregullave të kontabilistit duhet të ketë ${rule.minLength}–${rule.maxLength} shenja.`;
    }
  }
  return errors;
}

/**
 * A format check passes only if at least one rule exists and EVERY identifier entered has an
 * ACTIVE rule that it satisfies; otherwise no format validity is claimed.
 */
export function formatCheckPasses(
  identifiers: Record<string, string | null | undefined>,
  rules: FormatRule[],
): boolean {
  const present = Object.entries(identifiers).filter(([, value]) => value);
  if (rules.length === 0 || present.length === 0) return false;
  const ruled = new Set(rules.map((rule) => rule.identifierType));
  if (!present.every(([type]) => ruled.has(type))) return false;
  return Object.keys(checkAgainstRules(identifiers, rules)).length === 0;
}

export async function listFormatRules(db: Db, actor: Actor) {
  authorize(actor, "P-16");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, (tx) =>
    tx.select().from(identifierFormatRules).orderBy(desc(identifierFormatRules.createdAt)),
  );
}

/** P-15. Replaces the ACTIVE rule for this identifier type (the old one is RETIRED, kept). */
export async function setFormatRule(
  db: Db,
  actor: Actor,
  raw: z.input<typeof formatRuleSchema>,
  idempotencyKey: string,
) {
  authorize(actor, "P-15");
  const input = parseOrThrow(formatRuleSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "identifier_rule.set",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { ruleId: claim.resultId!, replayed: true };
    await assertActorActive(tx, actor);

    const [previous] = await tx
      .select()
      .from(identifierFormatRules)
      .where(
        and(
          eq(identifierFormatRules.identifierType, input.identifierType),
          eq(identifierFormatRules.status, "ACTIVE"),
        ),
      )
      .for("update");
    if (previous) {
      await tx
        .update(identifierFormatRules)
        .set({ status: "RETIRED", retiredBy: actor.userId, retiredAt: new Date() })
        .where(eq(identifierFormatRules.id, previous.id));
    }
    const [row] = await tx
      .insert(identifierFormatRules)
      .values({ orgId: actor.orgId, ...input, createdBy: actor.userId })
      .returning({ id: identifierFormatRules.id });
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "identifier_rule.set",
      entityType: "identifier_format_rule",
      entityId: row!.id,
      idempotencyKey,
      details: {
        identifierType: input.identifierType,
        label: IDENTIFIER_LABELS[input.identifierType],
        required: input.required,
        digitsOnly: input.digitsOnly,
        minLength: input.minLength,
        maxLength: input.maxLength,
        replaced: previous?.id ?? null,
      },
    });
    await completeIdempotencyKey(tx, claim.id, {
      resultType: "IDENTIFIER_RULE",
      resultId: row!.id,
    });
    return { ruleId: row!.id, replayed: false };
  });
}

/** P-15. Retires an ACTIVE rule without replacement. */
export async function retireFormatRule(
  db: Db,
  actor: Actor,
  ruleId: string,
  idempotencyKey: string,
) {
  authorize(actor, "P-15");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "identifier_rule.retire",
      requestHash: requestHash({ ruleId }),
    });
    if (claim.kind === "REPLAY") return { ruleId, replayed: true };
    await assertActorActive(tx, actor);
    const [rule] = await tx
      .select()
      .from(identifierFormatRules)
      .where(eq(identifierFormatRules.id, ruleId))
      .for("update");
    if (!rule) throw notFound();
    if (rule.status !== "ACTIVE") {
      throw new DomainError("RULE_RETIRED", "Ky rregull është tashmë jo aktiv.", 409);
    }
    await tx
      .update(identifierFormatRules)
      .set({ status: "RETIRED", retiredBy: actor.userId, retiredAt: new Date() })
      .where(eq(identifierFormatRules.id, ruleId));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "identifier_rule.retire",
      entityType: "identifier_format_rule",
      entityId: ruleId,
      idempotencyKey,
      details: { identifierType: rule.identifierType },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "IDENTIFIER_RULE", resultId: ruleId });
    return { ruleId, replayed: false };
  });
}
