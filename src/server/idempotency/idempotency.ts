import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { Tx } from "@/server/db/client";
import { idempotencyKeys } from "@/server/db/schema";
import { DomainError } from "@/server/errors";

export const idempotencyKeySchema = z.uuid();

export interface ClaimInput {
  orgId: string;
  actorId: string;
  key: string;
  operation: string;
  requestHash: string;
}

export type ClaimResult =
  | { kind: "CLAIMED"; id: string }
  | { kind: "REPLAY"; resultType: string | null; resultId: string | null };

export const keyReused = () =>
  new DomainError(
    "IDEMPOTENCY_KEY_REUSED",
    "Ky identifikues kërkese është përdorur tashmë për një kërkesë tjetër.",
    409,
  );

/**
 * DATABASE_TRANSACTION_BOUNDARIES §2.4. Must run inside the business transaction: a concurrent
 * duplicate blocks on the unique index until the first transaction ends, then sees its row.
 */
export async function claimIdempotencyKey(tx: Tx, input: ClaimInput): Promise<ClaimResult> {
  if (!idempotencyKeySchema.safeParse(input.key).success) {
    throw new DomainError(
      "IDEMPOTENCY_KEY_INVALID",
      "Identifikuesi i kërkesës nuk është i vlefshëm.",
    );
  }
  const [inserted] = await tx
    .insert(idempotencyKeys)
    .values({ ...input, status: "IN_PROGRESS" })
    .onConflictDoNothing({
      target: [idempotencyKeys.orgId, idempotencyKeys.actorId, idempotencyKeys.key],
    })
    .returning({ id: idempotencyKeys.id });
  if (inserted) return { kind: "CLAIMED", id: inserted.id };

  const [existing] = await tx
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.orgId, input.orgId),
        eq(idempotencyKeys.actorId, input.actorId),
        eq(idempotencyKeys.key, input.key),
      ),
    );
  if (
    !existing ||
    existing.operation !== input.operation ||
    existing.requestHash !== input.requestHash ||
    existing.status !== "COMPLETED"
  ) {
    throw keyReused();
  }
  return { kind: "REPLAY", resultType: existing.resultType, resultId: existing.resultId };
}

export async function completeIdempotencyKey(
  tx: Tx,
  claimId: string,
  result: { resultType: string; resultId: string | null },
): Promise<void> {
  await tx
    .update(idempotencyKeys)
    .set({ status: "COMPLETED", completedAt: sql`now()`, ...result })
    .where(eq(idempotencyKeys.id, claimId));
}
