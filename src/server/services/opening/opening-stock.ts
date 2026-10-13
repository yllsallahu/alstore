import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  openingBatchRefSchema,
  openingLineRemoveSchema,
  openingLineSchema,
  openingReconcileSchema,
  openingSignOffSchema,
} from "@/lib/validation/opening";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import {
  approvals,
  auditEvents,
  cutoverPlans,
  openingStockBatches,
  openingStockLines,
  products,
  stockEvents,
} from "@/server/db/schema";
import { DomainError, notFound } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash } from "@/server/lib/canonical-hash";

import { isUniqueViolation, parseOrThrow } from "../master-data/common";

type Replayable<T> = T & { replayed: boolean };

const ENTITY = "opening_stock_batch";
const SUBJECT = "OPENING_STOCK_BATCH";

export type OpeningBatchRow = typeof openingStockBatches.$inferSelect;

const notDraft = () =>
  new DomainError(
    "OPENING_NOT_EDITABLE",
    "Numërimi fillestar nuk është më në hartim. Hapeni përsëri për ta ndryshuar.",
    409,
  );
const alreadyPosted = () =>
  new DomainError(
    "OPENING_ALREADY_POSTED",
    "Gjendja fillestare është nënshkruar dhe regjistruar tashmë. Ndryshimet bëhen vetëm me rregullim të miratuar.",
    409,
  );
const wrongState = (expected: string) =>
  new DomainError(
    "OPENING_WRONG_STATE",
    `Ky veprim nuk lejohet në gjendjen aktuale të numërimit (nevojitet: ${expected}).`,
    409,
  );

async function lockBatch(tx: Tx, batchId: string): Promise<OpeningBatchRow> {
  if (!z.uuid().safeParse(batchId).success) throw notFound();
  const [batch] = await tx
    .select()
    .from(openingStockBatches)
    .where(eq(openingStockBatches.id, batchId))
    .for("update");
  if (!batch) throw notFound();
  return batch;
}

async function linesHash(tx: Tx, batchId: string): Promise<string> {
  const rows = await tx.execute<{ hash: string }>(
    sql`select app.opening_lines_hash(${batchId}::uuid) as hash`,
  );
  return rows[0]!.hash;
}

/** Products of the organization whose opening status this batch does not verify (INV-08). */
async function countUnverified(tx: Tx, batchId: string): Promise<number> {
  const rows = await tx.execute<{ n: string }>(
    sql`select count(*)::text as n from app.products p
        where not exists (
          select 1 from app.opening_stock_lines l
          where l.batch_id = ${batchId}::uuid and l.product_id = p.id
            and l.status in ('VERIFIED_QTY', 'VERIFIED_ZERO'))`,
  );
  return Number(rows[0]!.n);
}

/** P-22. One opening batch per DRAFT cutover plan; the count is reconciled to the plan's last Excel day. */
export async function createOpeningBatch(
  db: Db,
  actor: Actor,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  authorize(actor, "P-22");
  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "opening.batch.create",
        requestHash: requestHash({}),
      });
      if (claim.kind === "REPLAY") return { batchId: claim.resultId!, replayed: true };
      await assertActorActive(tx, actor);
      const [plan] = await tx
        .select()
        .from(cutoverPlans)
        .where(eq(cutoverPlans.status, "DRAFT"))
        .for("update");
      if (!plan) {
        throw new DomainError(
          "CUTOVER_PLAN_MISSING",
          "Ruani fillimisht planin e kalimit (data e fillimit dhe dita e fundit në Excel).",
          422,
        );
      }
      const [row] = await tx
        .insert(openingStockBatches)
        .values({
          orgId: actor.orgId,
          cutoverPlanId: plan.id,
          countedAsOf: plan.lastExcelDay,
          createdBy: actor.userId,
        })
        .returning({ id: openingStockBatches.id });
      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "opening.batch.create",
        entityType: ENTITY,
        entityId: row!.id,
        idempotencyKey,
        details: { countedAsOf: plan.lastExcelDay },
      });
      await completeIdempotencyKey(tx, claim.id, {
        resultType: "OPENING_BATCH",
        resultId: row!.id,
      });
      return { batchId: row!.id, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "opening_stock_batches_plan_uq")) {
      throw new DomainError(
        "OPENING_BATCH_EXISTS",
        "Ekziston tashmë një numërim fillestar për këtë plan.",
        409,
      );
    }
    throw error;
  }
}

/** P-22. Sets one product's physical count: quantity, verified zero or UNKNOWN (never blank = zero). */
export async function saveOpeningLine(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingLineSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  authorize(actor, "P-22");
  const input = parseOrThrow(openingLineSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "opening.line.save",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { batchId: input.batchId, replayed: true };
    await assertActorActive(tx, actor);
    const batch = await lockBatch(tx, input.batchId);
    if (batch.status !== "DRAFT") throw notDraft();
    const [product] = await tx
      .select({ id: products.id, sku: products.sku, unit: products.unit })
      .from(products)
      .where(eq(products.id, input.productId));
    if (!product) throw notFound();
    await tx
      .insert(openingStockLines)
      .values({
        orgId: actor.orgId,
        batchId: batch.id,
        productId: product.id,
        status: input.status,
        quantity: input.status === "VERIFIED_ZERO" ? "0.000" : input.quantity,
        countEvidence: input.evidence,
      })
      .onConflictDoUpdate({
        target: [openingStockLines.batchId, openingStockLines.productId],
        set: {
          status: input.status,
          quantity: input.status === "VERIFIED_ZERO" ? "0.000" : input.quantity,
          countEvidence: input.evidence,
        },
      });
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "opening.line.save",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      details: {
        sku: product.sku,
        unit: product.unit,
        status: input.status,
        quantity: input.quantity,
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "OPENING_BATCH", resultId: batch.id });
    return { batchId: batch.id, replayed: false };
  });
}

export async function removeOpeningLine(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingLineRemoveSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  authorize(actor, "P-22");
  const input = parseOrThrow(openingLineRemoveSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "opening.line.remove",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { batchId: input.batchId, replayed: true };
    await assertActorActive(tx, actor);
    const batch = await lockBatch(tx, input.batchId);
    if (batch.status !== "DRAFT") throw notDraft();
    const removed = await tx
      .delete(openingStockLines)
      .where(
        and(
          eq(openingStockLines.batchId, batch.id),
          eq(openingStockLines.productId, input.productId),
        ),
      )
      .returning({ id: openingStockLines.id });
    if (removed.length === 0) throw notFound();
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "opening.line.remove",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      details: { productId: input.productId },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "OPENING_BATCH", resultId: batch.id });
    return { batchId: batch.id, replayed: false };
  });
}

/** P-22. Counting is complete: lines freeze (DRAFT → COUNTED). */
export async function markCounted(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingBatchRefSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  authorize(actor, "P-22");
  const input = parseOrThrow(openingBatchRefSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "opening.counted",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { batchId: input.batchId, replayed: true };
    await assertActorActive(tx, actor);
    const batch = await lockBatch(tx, input.batchId);
    if (batch.status !== "DRAFT") throw wrongState("DRAFT");
    const [n] = await tx.execute<{ n: string }>(
      sql`select count(*)::text as n from app.opening_stock_lines where batch_id = ${batch.id}::uuid`,
    );
    if (Number(n!.n) === 0) {
      throw new DomainError(
        "OPENING_EMPTY",
        "Shtoni të paktën një rresht numërimi para përfundimit.",
        422,
      );
    }
    await tx
      .update(openingStockBatches)
      .set({ status: "COUNTED", countedBy: actor.userId, countedAt: sql`now()` })
      .where(eq(openingStockBatches.id, batch.id));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "opening.counted",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      afterHash: await linesHash(tx, batch.id),
      details: { lines: Number(n!.n) },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "OPENING_BATCH", resultId: batch.id });
    return { batchId: batch.id, replayed: false };
  });
}

/** P-22. Steps back one state; any reconciliation approval is INVALIDATED (never deleted). */
export async function reopenOpeningBatch(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingBatchRefSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string; status: string }>> {
  authorize(actor, "P-22");
  const input = parseOrThrow(openingBatchRefSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "opening.reopen",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY")
      return { batchId: input.batchId, status: "REPLAY", replayed: true };
    await assertActorActive(tx, actor);
    const batch = await lockBatch(tx, input.batchId);
    let status: "DRAFT" | "COUNTED";
    if (batch.status === "COUNTED") {
      await tx
        .update(openingStockBatches)
        .set({ status: "DRAFT", countedBy: null, countedAt: null })
        .where(eq(openingStockBatches.id, batch.id));
      status = "DRAFT";
    } else if (batch.status === "RECONCILED") {
      await tx
        .update(approvals)
        .set({ decision: "INVALIDATED" })
        .where(eq(approvals.id, batch.reconciliationApprovalId!));
      await tx
        .update(openingStockBatches)
        .set({
          status: "COUNTED",
          reconciledBy: null,
          reconciledAt: null,
          reconciliationNote: null,
          reconciliationApprovalId: null,
          linesHash: null,
        })
        .where(eq(openingStockBatches.id, batch.id));
      status = "COUNTED";
    } else if (batch.status === "SIGNED_OFF" || batch.status === "POSTED") {
      throw alreadyPosted();
    } else {
      throw wrongState("COUNTED / RECONCILED");
    }
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "opening.reopen",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      details: { from: batch.status, to: status },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "OPENING_BATCH", resultId: batch.id });
    return { batchId: batch.id, status, replayed: false };
  });
}

/** P-23 (accountant). Records the REVIEWED approval bound to the lines hash and a required note. */
export async function reconcileOpeningBatch(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingReconcileSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string; linesHash: string }>> {
  authorize(actor, "P-23");
  const input = parseOrThrow(openingReconcileSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "opening.reconcile",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      return {
        batchId: input.batchId,
        linesHash: await linesHash(tx, input.batchId),
        replayed: true,
      };
    }
    await assertActorActive(tx, actor);
    const batch = await lockBatch(tx, input.batchId);
    if (batch.status === "SIGNED_OFF" || batch.status === "POSTED") throw alreadyPosted();
    if (batch.status !== "COUNTED") throw wrongState("COUNTED");
    const hash = await linesHash(tx, batch.id);
    const [approval] = await tx
      .insert(approvals)
      .values({
        orgId: actor.orgId,
        subjectType: SUBJECT,
        subjectId: batch.id,
        approvalKind: "OPENING_RECONCILED",
        actorId: actor.userId,
        actorRole: actor.role,
        decision: "REVIEWED",
        comment: input.note,
        subjectHash: hash,
      })
      .returning({ id: approvals.id });
    await tx
      .update(openingStockBatches)
      .set({
        status: "RECONCILED",
        reconciledBy: actor.userId,
        reconciledAt: sql`now()`,
        reconciliationNote: input.note,
        reconciliationApprovalId: approval!.id,
        linesHash: hash,
      })
      .where(eq(openingStockBatches.id, batch.id));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "opening.reconcile",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      afterHash: hash,
      details: { countedAsOf: batch.countedAsOf },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "OPENING_BATCH", resultId: batch.id });
    return { batchId: batch.id, linesHash: hash, replayed: false };
  });
}

/**
 * P-24 (director). Sign-off and posting are one transaction: approval → SIGNED_OFF → plan LOCKED →
 * OPENING stock event at the cutover instant → one movement per verified quantity → balances →
 * POSTED. Any failure rolls back all of it.
 */
export async function signOffAndPostOpeningBatch(
  db: Db,
  actor: Actor,
  raw: z.input<typeof openingSignOffSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string; stockEventId: string; movementCount: number }>> {
  authorize(actor, "P-24");
  const input = parseOrThrow(openingSignOffSchema, raw);
  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "opening.signoff",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") {
        const [batch] = await tx
          .select()
          .from(openingStockBatches)
          .where(eq(openingStockBatches.id, input.batchId));
        const [count] = await tx.execute<{ n: string }>(
          sql`select count(*)::text as n from app.stock_movements where stock_event_id = ${batch?.postedStockEventId ?? null}`,
        );
        return {
          batchId: input.batchId,
          stockEventId: batch?.postedStockEventId ?? "",
          movementCount: Number(count?.n ?? 0),
          replayed: true,
        };
      }
      await assertActorActive(tx, actor);
      const batch = await lockBatch(tx, input.batchId);
      if (batch.status === "SIGNED_OFF" || batch.status === "POSTED") throw alreadyPosted();
      if (batch.status !== "RECONCILED") throw wrongState("RECONCILED");
      if (batch.reconciledBy === actor.userId) {
        throw new DomainError(
          "FOUR_EYES_REQUIRED",
          "Nënshkrimin duhet ta bëjë një përdorues tjetër nga ai që e rakordoi numërimin.",
          403,
        );
      }
      const hash = await linesHash(tx, batch.id);
      if (hash !== batch.linesHash || hash !== input.expectedLinesHash) {
        throw new DomainError(
          "OPENING_CHANGED",
          "Numërimi ndryshoi pas rakordimit. Rakordojeni përsëri para nënshkrimit.",
          409,
        );
      }
      const [plan] = await tx
        .select()
        .from(cutoverPlans)
        .where(eq(cutoverPlans.id, batch.cutoverPlanId))
        .for("update");
      if (!plan || plan.status !== "DRAFT" || !plan.cutoverInstant) {
        throw new DomainError("CUTOVER_LOCKED", "Plani i kalimit nuk është në hartim.", 409);
      }
      const unknown = await countUnverified(tx, batch.id);
      if (unknown !== input.acknowledgedUnknownCount) {
        throw new DomainError(
          "UNKNOWN_COUNT_MISMATCH",
          `Numri i produkteve pa gjendje të verifikuar është ${unknown}. Konfirmoni këtë numër para nënshkrimit.`,
          409,
        );
      }

      const [approval] = await tx
        .insert(approvals)
        .values({
          orgId: actor.orgId,
          subjectType: SUBJECT,
          subjectId: batch.id,
          approvalKind: "OPENING_SIGNOFF",
          actorId: actor.userId,
          actorRole: actor.role,
          requesterId: batch.reconciledBy,
          requiresFourEyes: true,
          decision: "APPROVED",
          subjectHash: hash,
        })
        .returning({ id: approvals.id });
      await tx
        .update(openingStockBatches)
        .set({
          status: "SIGNED_OFF",
          signedOffBy: actor.userId,
          signedOffAt: sql`now()`,
          signoffApprovalId: approval!.id,
          unknownAcknowledgedCount: unknown,
        })
        .where(eq(openingStockBatches.id, batch.id));
      await tx
        .update(cutoverPlans)
        .set({
          status: "LOCKED",
          signedBy: actor.userId,
          signedAt: sql`now()`,
          version: sql`${cutoverPlans.version} + 1`,
          updatedAt: sql`now()`,
        })
        .where(eq(cutoverPlans.id, plan.id));

      const [event] = await tx
        .insert(stockEvents)
        .values({
          orgId: actor.orgId,
          eventType: "OPENING",
          sourceType: SUBJECT,
          sourceId: batch.id,
          effectiveAt: plan.cutoverInstant,
          documentDate: plan.plannedCutoverDate,
          postedBy: actor.userId,
        })
        .returning({ id: stockEvents.id });

      // Lock order: stock_balances by product_id (DATABASE_TRANSACTION_BOUNDARIES).
      await tx.execute(
        sql`select product_id from app.stock_balances
            where product_id in (select product_id from app.opening_stock_lines
                                 where batch_id = ${batch.id}::uuid and status = 'VERIFIED_QTY')
            order by product_id for update`,
      );
      const moved = await tx.execute<{ id: string }>(
        sql`insert into app.stock_movements
              (org_id, stock_event_id, product_id, quantity_delta, unit, source_type, movement_type, source_line_id)
            select ${actor.orgId}::uuid, ${event!.id}::uuid, l.product_id, l.quantity, p.unit,
                   'OPENING_STOCK_BATCH', 'OPENING', l.id
            from app.opening_stock_lines l join app.products p on p.id = l.product_id
            where l.batch_id = ${batch.id}::uuid and l.status = 'VERIFIED_QTY'
            order by l.product_id
            returning id`,
      );
      await tx.execute(
        sql`update app.stock_balances sb
            set on_hand = sb.on_hand + m.quantity_delta, last_movement_id = m.id,
                version = sb.version + 1, updated_at = now()
            from app.stock_movements m
            where m.stock_event_id = ${event!.id}::uuid and m.product_id = sb.product_id`,
      );
      await tx
        .update(openingStockBatches)
        .set({ status: "POSTED", postedAt: sql`now()`, postedStockEventId: event!.id })
        .where(eq(openingStockBatches.id, batch.id));

      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "opening.post",
        entityType: ENTITY,
        entityId: batch.id,
        idempotencyKey,
        afterHash: hash,
        details: {
          stockEventId: event!.id,
          movements: moved.length,
          unknownAcknowledged: unknown,
          cutoverDate: plan.plannedCutoverDate,
        },
      });
      await completeIdempotencyKey(tx, claim.id, {
        resultType: "OPENING_BATCH",
        resultId: batch.id,
      });
      return {
        batchId: batch.id,
        stockEventId: event!.id,
        movementCount: moved.length,
        replayed: false,
      };
    });
  } catch (error) {
    if (
      isUniqueViolation(error, "opening_stock_batches_one_posted_uq") ||
      isUniqueViolation(error, "stock_events_source_uq") ||
      isUniqueViolation(error, "stock_movements_one_opening_uq")
    ) {
      throw alreadyPosted();
    }
    throw error;
  }
}

export interface OpeningLineView {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  status: string;
  quantity: string | null;
  evidence: string | null;
}

/** P-44. Batch, lines (filterable), progress counters, approvals trail. */
export async function getOpeningBatch(
  db: Db,
  actor: Actor,
  batchId: string,
  options: { filter?: "ALL" | "UNKNOWN" | "QTY" | "ZERO"; limit?: number } = {},
) {
  authorize(actor, "P-44");
  if (!z.uuid().safeParse(batchId).success) throw notFound();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [batch] = await tx
      .select()
      .from(openingStockBatches)
      .where(eq(openingStockBatches.id, batchId));
    if (!batch) throw notFound();
    const [plan] = await tx
      .select()
      .from(cutoverPlans)
      .where(eq(cutoverPlans.id, batch.cutoverPlanId));
    const statusFilter =
      options.filter === "UNKNOWN"
        ? "UNKNOWN"
        : options.filter === "QTY"
          ? "VERIFIED_QTY"
          : options.filter === "ZERO"
            ? "VERIFIED_ZERO"
            : null;
    const lines = await tx
      .select({
        productId: openingStockLines.productId,
        sku: products.sku,
        name: products.name,
        unit: products.unit,
        status: openingStockLines.status,
        quantity: openingStockLines.quantity,
        evidence: openingStockLines.countEvidence,
      })
      .from(openingStockLines)
      .innerJoin(products, eq(products.id, openingStockLines.productId))
      .where(
        and(
          eq(openingStockLines.batchId, batchId),
          statusFilter ? eq(openingStockLines.status, statusFilter) : undefined,
        ),
      )
      .orderBy(asc(products.sku))
      .limit(limit);
    const [counts] = await tx.execute<{
      total: string;
      qty: string;
      zero: string;
      unknown: string;
    }>(
      sql`select count(*)::text as total,
                 count(*) filter (where status = 'VERIFIED_QTY')::text as qty,
                 count(*) filter (where status = 'VERIFIED_ZERO')::text as zero,
                 count(*) filter (where status = 'UNKNOWN')::text as unknown
          from app.opening_stock_lines where batch_id = ${batchId}::uuid`,
    );
    const [productCount] = await tx.execute<{ n: string }>(
      sql`select count(*)::text as n from app.products`,
    );
    const unverifiedProducts = await countUnverified(tx, batchId);
    const history = await tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        action: auditEvents.action,
        actorRole: auditEvents.actorRole,
        details: auditEvents.safeDetails,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, ENTITY), eq(auditEvents.entityId, batchId)))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(30);
    const currentHash = await linesHash(tx, batchId);
    return {
      batch,
      plan: plan ?? null,
      lines: lines as OpeningLineView[],
      shownLines: lines.length,
      counts: {
        total: Number(counts!.total),
        verifiedQty: Number(counts!.qty),
        verifiedZero: Number(counts!.zero),
        unknown: Number(counts!.unknown),
        products: Number(productCount!.n),
        unverifiedProducts,
      },
      linesHash: currentHash,
      history,
    };
  });
}

export async function listOpeningBatches(db: Db, actor: Actor) {
  authorize(actor, "P-44");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, (tx) =>
    tx
      .select({
        id: openingStockBatches.id,
        status: openingStockBatches.status,
        countedAsOf: openingStockBatches.countedAsOf,
        createdAt: openingStockBatches.createdAt,
        postedAt: openingStockBatches.postedAt,
      })
      .from(openingStockBatches)
      .orderBy(desc(openingStockBatches.createdAt))
      .limit(20),
  );
}

/** P-22. Resolves a typed SKU to a product for the count form; never creates one. */
export async function findProductForCount(db: Db, actor: Actor, rawSku: string) {
  authorize(actor, "P-44");
  const sku = rawSku.trim().toUpperCase();
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    if (sku === "") return null;
    const [row] = await tx
      .select({ id: products.id, sku: products.sku, name: products.name, unit: products.unit })
      .from(products)
      .where(eq(products.sku, sku));
    return row ?? null;
  });
}
