import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActorActive } from "@/server/auth/actor";
import {
  AuthorizationError,
  JOINT_GATES,
  authorize,
  canApproveGate,
  type Actor,
} from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import { approvals, releaseGates } from "@/server/db/schema";
import { DomainError } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash } from "@/server/lib/canonical-hash";

export const gateDecisionSchema = z.object({
  gateKey: z.string().regex(/^(VG|RG)-[0-9]{2}$/),
  comment: z.string().trim().max(500).optional(),
});

const SUBJECT = "RELEASE_GATE";

function authorizeGate(actor: Actor, gateKey: string) {
  authorize(actor, "P-07");
  if (!canApproveGate(actor.role, gateKey)) throw new AuthorizationError("FORBIDDEN", "P-07");
}

async function lockGate(tx: Tx, orgId: string, gateKey: string) {
  await tx.insert(releaseGates).values({ orgId, gateKey }).onConflictDoNothing();
  const [gate] = await tx
    .select()
    .from(releaseGates)
    .where(and(eq(releaseGates.orgId, orgId), eq(releaseGates.gateKey, gateKey)))
    .for("update");
  if (!gate) throw new Error("release gate row missing after upsert");
  return gate;
}

/**
 * P-07. Joint gates (VG-06, VG-11) become APPROVED only once each role has a live approval;
 * every other gate is approved by its single named role.
 */
export async function approveReleaseGate(
  db: Db,
  actor: Actor,
  rawInput: z.infer<typeof gateDecisionSchema>,
  idempotencyKey: string,
) {
  const input = gateDecisionSchema.parse(rawInput);
  authorizeGate(actor, input.gateKey);

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "release_gate.approve",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      const [gate] = claim.resultId
        ? await tx
            .select({ status: releaseGates.status })
            .from(releaseGates)
            .where(eq(releaseGates.id, claim.resultId))
        : [];
      return { gateId: claim.resultId, status: gate?.status ?? null, replayed: true };
    }

    await assertActorActive(tx, actor);
    const gate = await lockGate(tx, actor.orgId, input.gateKey);
    if (gate.status === "APPROVED") {
      throw new DomainError("GATE_ALREADY_APPROVED", "Kjo portë është miratuar tashmë.", 409);
    }

    const live = await tx
      .select({ actorRole: approvals.actorRole })
      .from(approvals)
      .where(
        and(
          eq(approvals.subjectType, SUBJECT),
          eq(approvals.subjectId, gate.id),
          eq(approvals.decision, "APPROVED"),
        ),
      );
    if (live.some((row) => row.actorRole === actor.role)) {
      throw new DomainError("GATE_ALREADY_APPROVED", "Kjo portë është miratuar tashmë.", 409);
    }

    await tx.insert(approvals).values({
      orgId: actor.orgId,
      subjectType: SUBJECT,
      subjectId: gate.id,
      approvalKind: "GATE_APPROVAL",
      actorId: actor.userId,
      actorRole: actor.role,
      decision: "APPROVED",
      comment: input.comment ?? null,
    });

    const joint = JOINT_GATES.has(input.gateKey);
    const complete = !joint || live.length > 0;
    const status = complete ? "APPROVED" : "EVIDENCE_PENDING";
    await tx
      .update(releaseGates)
      .set({
        status,
        approvedBy: complete ? actor.userId : null,
        approvedAt: complete ? sql`now()` : null,
        updatedAt: sql`now()`,
      })
      .where(eq(releaseGates.id, gate.id));

    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "release_gate.approve",
      entityType: "release_gate",
      entityId: gate.id,
      idempotencyKey,
      details: { gateKey: input.gateKey, joint, from: gate.status, to: status },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: SUBJECT, resultId: gate.id });
    return { gateId: gate.id, status, replayed: false };
  });
}

/** P-07 revoke: the gate fails closed again and every live approval is invalidated. */
export async function revokeReleaseGate(
  db: Db,
  actor: Actor,
  rawInput: z.infer<typeof gateDecisionSchema>,
  idempotencyKey: string,
) {
  const input = gateDecisionSchema.parse(rawInput);
  authorizeGate(actor, input.gateKey);

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "release_gate.revoke",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      return { gateId: claim.resultId, status: "REVOKED", replayed: true };
    }

    await assertActorActive(tx, actor);
    const gate = await lockGate(tx, actor.orgId, input.gateKey);
    await tx
      .update(approvals)
      .set({ decision: "INVALIDATED" })
      .where(
        and(
          eq(approvals.subjectType, SUBJECT),
          eq(approvals.subjectId, gate.id),
          eq(approvals.decision, "APPROVED"),
        ),
      );
    await tx
      .update(releaseGates)
      .set({ status: "REVOKED", approvedBy: null, approvedAt: null, updatedAt: sql`now()` })
      .where(eq(releaseGates.id, gate.id));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "release_gate.revoke",
      entityType: "release_gate",
      entityId: gate.id,
      idempotencyKey,
      details: { gateKey: input.gateKey, from: gate.status, comment: input.comment ?? null },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: SUBJECT, resultId: gate.id });
    return { gateId: gate.id, status: "REVOKED", replayed: false };
  });
}
