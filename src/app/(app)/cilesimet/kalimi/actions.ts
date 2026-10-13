"use server";

import type { FormState } from "@/components/forms/form-state";
import { checked, echo, runFormAction, text } from "@/server/actions/form-action";
import { proposeInvoiceSeries, saveCutoverPlan } from "@/server/services/cutover/cutover";

export async function saveCutoverPlanAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const version = text(form, "expectedVersion");
    await saveCutoverPlan(
      db,
      actor,
      {
        plannedCutoverDate: text(form, "plannedCutoverDate"),
        lastExcelDay: text(form, "lastExcelDay"),
        midMonthAcknowledged: checked(form, "midMonthAcknowledged"),
        expectedVersion: version === "" ? null : Number(version),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: "/cilesimet/kalimi?ruajtur=plani" };
  });
}

export async function proposeSeriesAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    await proposeInvoiceSeries(
      db,
      actor,
      {
        fiscalYear: text(form, "fiscalYear"),
        kind: "SALES_INVOICE",
        code: text(form, "code"),
        legacyLastNumber: text(form, "legacyLastNumber"),
        noInvoicesYet: checked(form, "noInvoicesYet"),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: "/cilesimet/kalimi?ruajtur=seria" };
  });
}
