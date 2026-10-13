import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";

import { cutoverPlanSchema, invoiceSeriesProposalSchema } from "@/lib/validation/opening";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db } from "@/server/db/client";
import { cutoverPlans, invoiceSeries, openingStockBatches } from "@/server/db/schema";
import { DomainError, staleVersion } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash, sha256Hex, canonicalJson } from "@/server/lib/canonical-hash";

import { isUniqueViolation, parseOrThrow } from "../master-data/common";

type Replayable<T> = T & { replayed: boolean };

const PLAN = "cutover_plan";
const SERIES = "invoice_series";

const planLocked = () =>
  new DomainError(
    "CUTOVER_LOCKED",
    "Plani i kalimit është mbyllur pas nënshkrimit të gjendjes fillestare dhe nuk mund të ndryshohet.",
    409,
  );
const countingDone = () =>
  new DomainError(
    "CUTOVER_COUNTING_DONE",
    "Numërimi fillestar është përfunduar. Hapeni përsëri numërimin në hartim para se të ndryshoni datat.",
    409,
  );

/** P-44. The one active plan (DRAFT or LOCKED) or the latest executed one, with batch and series. */
export async function getCutoverOverview(db: Db, actor: Actor) {
  authorize(actor, "P-44");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [plan] = await tx
      .select()
      .from(cutoverPlans)
      .orderBy(
        sql`case ${cutoverPlans.status} when 'DRAFT' then 0 when 'LOCKED' then 1 else 2 end`,
        desc(cutoverPlans.createdAt),
      )
      .limit(1);
    const [batch] = plan
      ? await tx
          .select()
          .from(openingStockBatches)
          .where(eq(openingStockBatches.cutoverPlanId, plan.id))
      : [];
    const series = await tx
      .select()
      .from(invoiceSeries)
      .orderBy(desc(invoiceSeries.fiscalYear), asc(invoiceSeries.kind));
    return { plan: plan ?? null, batch: batch ?? null, series };
  });
}

/** P-31. Creates or edits the DRAFT plan; the cutover instant is computed in the database. */
export async function saveCutoverPlan(
  db: Db,
  actor: Actor,
  raw: z.input<typeof cutoverPlanSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ planId: string }>> {
  authorize(actor, "P-31");
  const input = parseOrThrow(cutoverPlanSchema, raw);
  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "cutover.plan.save",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") return { planId: claim.resultId!, replayed: true };
      await assertActorActive(tx, actor);

      const [current] = await tx
        .select()
        .from(cutoverPlans)
        .where(inArray(cutoverPlans.status, ["DRAFT", "LOCKED"]))
        .for("update");
      const instant = sql`(${input.plannedCutoverDate}::date::timestamp at time zone 'Europe/Belgrade')`;
      const midMonth = !input.plannedCutoverDate.endsWith("-01");
      let planId: string;
      let action: string;

      if (!current) {
        const [row] = await tx
          .insert(cutoverPlans)
          .values({
            orgId: actor.orgId,
            plannedCutoverDate: input.plannedCutoverDate,
            lastExcelDay: input.lastExcelDay,
            cutoverInstant: instant,
            midMonthAcknowledged: midMonth,
            createdBy: actor.userId,
          })
          .returning({ id: cutoverPlans.id });
        planId = row!.id;
        action = "cutover.plan.create";
      } else {
        if (current.status === "LOCKED") throw planLocked();
        if (input.expectedVersion != null && current.version !== input.expectedVersion) {
          throw staleVersion();
        }
        const [batch] = await tx
          .select({ id: openingStockBatches.id, status: openingStockBatches.status })
          .from(openingStockBatches)
          .where(eq(openingStockBatches.cutoverPlanId, current.id))
          .for("update");
        const datesChange =
          current.plannedCutoverDate !== input.plannedCutoverDate ||
          current.lastExcelDay !== input.lastExcelDay;
        if (batch && batch.status !== "DRAFT" && datesChange) throw countingDone();
        if (datesChange) {
          // The DRAFT batch's counted-as-of day follows the plan; set it first so both rows agree.
          await tx
            .update(cutoverPlans)
            .set({
              plannedCutoverDate: input.plannedCutoverDate,
              lastExcelDay: input.lastExcelDay,
              cutoverInstant: instant,
              midMonthAcknowledged: midMonth,
              version: sql`${cutoverPlans.version} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(cutoverPlans.id, current.id));
          if (batch) {
            await tx
              .update(openingStockBatches)
              .set({ countedAsOf: input.lastExcelDay })
              .where(eq(openingStockBatches.id, batch.id));
          }
        }
        planId = current.id;
        action = "cutover.plan.update";
      }

      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action,
        entityType: PLAN,
        entityId: planId,
        idempotencyKey,
        afterHash: sha256Hex(
          canonicalJson({
            plannedCutoverDate: input.plannedCutoverDate,
            lastExcelDay: input.lastExcelDay,
          }),
        ),
        details: {
          plannedCutoverDate: input.plannedCutoverDate,
          lastExcelDay: input.lastExcelDay,
          midMonthAcknowledged: midMonth,
        },
      });
      await completeIdempotencyKey(tx, claim.id, { resultType: "CUTOVER_PLAN", resultId: planId });
      return { planId, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "cutover_plans_one_active_uq")) {
      throw new DomainError("CUTOVER_PLAN_EXISTS", "Ekziston tashmë një plan kalimi aktiv.", 409);
    }
    throw error;
  }
}

const yearOf = (isoDate: string) => Number(isoDate.slice(0, 4));

/**
 * P-25. Records the last invoice number already issued in the chosen calendar year (or that none
 * was). No invoice is issued here; the accountant's approval of the continuation is a later gate.
 */
export async function proposeInvoiceSeries(
  db: Db,
  actor: Actor,
  raw: z.input<typeof invoiceSeriesProposalSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ seriesId: string }>> {
  authorize(actor, "P-25");
  const input = parseOrThrow(invoiceSeriesProposalSchema, raw);
  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "invoice.series.propose",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") return { seriesId: claim.resultId!, replayed: true };
      await assertActorActive(tx, actor);

      const [plan] = await tx
        .select()
        .from(cutoverPlans)
        .where(inArray(cutoverPlans.status, ["DRAFT", "LOCKED"]));
      if (!plan) {
        throw new DomainError(
          "CUTOVER_PLAN_MISSING",
          "Ruani fillimisht planin e kalimit (data e fillimit në sistem).",
          422,
        );
      }
      if (yearOf(plan.plannedCutoverDate) !== input.fiscalYear) {
        throw new DomainError(
          "SERIES_YEAR_MISMATCH",
          `Viti i serisë duhet të jetë viti i datës së fillimit në sistem (${yearOf(plan.plannedCutoverDate)}).`,
          422,
        );
      }
      if (input.legacyLastNumber !== null && yearOf(plan.lastExcelDay) !== input.fiscalYear) {
        throw new DomainError(
          "SERIES_LEGACY_YEAR",
          "Dita e fundit në Excel është në vit tjetër. Për këtë vit nuk ka fatura të vjetra — konfirmoni që nuk ka fatura.",
          422,
        );
      }

      const [existing] = await tx
        .select()
        .from(invoiceSeries)
        .where(
          and(eq(invoiceSeries.fiscalYear, input.fiscalYear), eq(invoiceSeries.kind, input.kind)),
        )
        .for("update");
      if (existing && existing.status !== "PROPOSED") {
        throw new DomainError(
          "SERIES_DECIDED",
          "Seria për këtë vit është vendosur tashmë dhe nuk mund të ndryshohet këtu.",
          409,
        );
      }
      if (existing && input.expectedVersion != null && existing.version !== input.expectedVersion) {
        throw staleVersion();
      }

      const values = {
        code: input.code,
        legacyLastNumber: input.legacyLastNumber,
        nextNumber: (input.legacyLastNumber ?? 0) + 1,
        proposedBy: actor.userId,
      };
      let seriesId: string;
      if (existing) {
        await tx
          .update(invoiceSeries)
          .set({ ...values, version: sql`${invoiceSeries.version} + 1`, updatedAt: sql`now()` })
          .where(eq(invoiceSeries.id, existing.id));
        seriesId = existing.id;
      } else {
        const [row] = await tx
          .insert(invoiceSeries)
          .values({ orgId: actor.orgId, fiscalYear: input.fiscalYear, kind: input.kind, ...values })
          .returning({ id: invoiceSeries.id });
        seriesId = row!.id;
      }
      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: existing ? "invoice.series.update" : "invoice.series.propose",
        entityType: SERIES,
        entityId: seriesId,
        idempotencyKey,
        afterHash: sha256Hex(
          canonicalJson({ year: input.fiscalYear, kind: input.kind, ...values }),
        ),
        details: {
          fiscalYear: input.fiscalYear,
          kind: input.kind,
          code: input.code,
          legacyLastNumber: input.legacyLastNumber,
          nextNumber: values.nextNumber,
        },
      });
      await completeIdempotencyKey(tx, claim.id, {
        resultType: "INVOICE_SERIES",
        resultId: seriesId,
      });
      return { seriesId, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("SERIES_EXISTS", "Kjo seri ekziston tashmë.", 409);
    }
    throw error;
  }
}
