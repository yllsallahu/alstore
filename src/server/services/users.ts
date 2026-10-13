import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db } from "@/server/db/client";
import { userRoles, users } from "@/server/db/schema";
import { ROLES } from "@/server/db/schema/enums";
import { DomainError, notFound } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash } from "@/server/lib/canonical-hash";

export const inviteUserSchema = z.object({
  userId: z.uuid(),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
});

export const setUserStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

type Replayable<T> = T & { replayed: boolean };

/**
 * P-01. Exactly one personal account per role: a second non-disabled holder is refused.
 * Creating the Supabase Auth identity and the invite email is BLOCKED (PHASE_02 §6).
 */
export async function inviteUser(
  db: Db,
  actor: Actor,
  rawInput: z.infer<typeof inviteUserSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ userId: string }>> {
  authorize(actor, "P-01");
  const input = inviteUserSchema.parse(rawInput);

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "user.invite",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { userId: claim.resultId ?? input.userId, replayed: true };

    await assertActorActive(tx, actor);
    const [holder] = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(and(eq(userRoles.role, input.role), ne(users.status, "DISABLED")))
      .for("update");
    if (holder) {
      throw new DomainError("ROLE_ALREADY_HELD", "Ky rol ka tashmë një llogari personale.", 409);
    }

    await tx.insert(users).values({
      id: input.userId,
      orgId: actor.orgId,
      displayName: input.displayName,
      status: "INVITED",
    });
    await tx.insert(userRoles).values({
      userId: input.userId,
      orgId: actor.orgId,
      role: input.role,
      grantedBy: actor.userId,
    });
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "user.invite",
      entityType: "user",
      entityId: input.userId,
      idempotencyKey,
      details: { role: input.role },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "USER", resultId: input.userId });
    return { userId: input.userId, replayed: false };
  });
}

/** P-01. The DIRECTOR cannot disable their own account (no lock-out without break-glass). */
export async function setUserStatus(
  db: Db,
  actor: Actor,
  rawInput: z.infer<typeof setUserStatusSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ userId: string; status: string }>> {
  authorize(actor, "P-01");
  const input = setUserStatusSchema.parse(rawInput);
  if (input.userId === actor.userId) {
    throw new DomainError("SELF_STATUS_CHANGE", "Nuk mund të ndryshoni statusin e llogarisë suaj.");
  }

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "user.set_status",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { ...input, replayed: true };

    await assertActorActive(tx, actor);
    const [target] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, input.userId))
      .for("update");
    if (!target) throw notFound();
    if (target.status === input.status) {
      throw new DomainError("STATUS_UNCHANGED", "Llogaria e ka tashmë këtë status.", 409);
    }

    await tx
      .update(users)
      .set({
        status: input.status,
        disabledAt: input.status === "DISABLED" ? sql`now()` : null,
      })
      .where(eq(users.id, input.userId));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: input.status === "DISABLED" ? "user.disable" : "user.activate",
      entityType: "user",
      entityId: input.userId,
      idempotencyKey,
      details: { from: target.status, to: input.status },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "USER", resultId: input.userId });
    return { ...input, replayed: false };
  });
}
