import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { ActionForm, FormField } from "@/components/forms/action-form";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant, formatLocalDate } from "@/lib/dates";
import { CUTOVER_STATUS_LABELS, SERIES_STATUS_LABELS } from "@/lib/opening-labels";
import { getRequestContext } from "@/server/auth/session";
import { getCutoverOverview } from "@/server/services/cutover/cutover";

import { proposeSeriesAction, saveCutoverPlanAction } from "./actions";

export const metadata: Metadata = { title: "Kalimi nga Excel" };

export default async function CutoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const ctx = await getRequestContext();
  const crumbs = [{ href: "/cilesimet", label: "Cilësimet" }];
  const header = (
    <PageHeader
      title="Kalimi nga Excel"
      description="Data e synuar e fillimit në sistem, dita e fundit e punës në Excel dhe numri i faturës së fundit të lëshuar. Këtu nuk lëshohet asnjë faturë dhe nuk importohet asnjë regjistër i vjetër."
      crumbs={crumbs}
    />
  );
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        {header}
        <Unavailable context={ctx} />
      </div>
    );
  }
  const { plan, batch, series } = await getCutoverOverview(ctx.db, ctx.actor);
  const locked = plan?.status === "LOCKED" || plan?.status === "EXECUTED";
  const countingDone = !!batch && batch.status !== "DRAFT";
  const planStatus = plan
    ? (CUTOVER_STATUS_LABELS[plan.status] ?? { label: plan.status, tone: "neutral" as const })
    : null;
  const year = plan ? Number(plan.plannedCutoverDate.slice(0, 4)) : new Date().getFullYear();
  const lastExcelYear = plan ? Number(plan.lastExcelDay.slice(0, 4)) : null;
  const yearSeries = series.find((s) => s.fiscalYear === year && s.kind === "SALES_INVOICE");
  const seriesFrozen = !!yearSeries && yearSeries.status !== "PROPOSED";

  return (
    <div className="mx-auto max-w-4xl">
      {header}
      <SavedNotice code={typeof query.ruajtur === "string" ? query.ruajtur : undefined} />

      <Section
        id="plani"
        title="Plani i kalimit"
        description="Fillimi i synuar është ditën e parë të një muaji. Momenti i kalimit është mesnata e kësaj date, ora e Kosovës."
      >
        {plan && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            {planStatus && <StatusBadge tone={planStatus.tone}>{planStatus.label}</StatusBadge>}
            <span>
              Fillimi: <strong>{formatLocalDate(plan.plannedCutoverDate)}</strong>
            </span>
            <span>
              Dita e fundit në Excel: <strong>{formatLocalDate(plan.lastExcelDay)}</strong>
            </span>
            <span className="text-ink-muted">
              Momenti i kalimit: {formatInstant(plan.cutoverInstant)}
            </span>
          </div>
        )}
        {locked ? (
          <Alert tone="info" role="status">
            Plani është i mbyllur pas nënshkrimit të gjendjes fillestare dhe nuk ndryshohet.
          </Alert>
        ) : countingDone ? (
          <Alert tone="warn" role="status">
            Numërimi fillestar ka përfunduar; datat ngrijnë. Hapeni numërimin përsëri për t&apos;i
            ndryshuar.
          </Alert>
        ) : (
          <ActionForm
            action={saveCutoverPlanAction}
            idempotencyKey={randomUUID()}
            hidden={plan ? { expectedVersion: String(plan.version) } : undefined}
            submitLabel="Ruaj planin"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="plannedCutoverDate"
                kind="date"
                required
                label="Data e fillimit në sistem"
                defaultValue={plan?.plannedCutoverDate ?? ""}
              />
              <FormField
                name="lastExcelDay"
                kind="date"
                required
                label="Dita e fundit e punës në Excel"
                defaultValue={plan?.lastExcelDay ?? ""}
              />
            </div>
            <FormField
              name="midMonthAcknowledged"
              kind="checkbox"
              label="Fillimi nuk është dita e parë e muajit: kontabilisti e ka konfirmuar qasjen për periudhën"
              defaultValue={plan?.midMonthAcknowledged ? "on" : ""}
            />
          </ActionForm>
        )}
      </Section>

      <Section
        id="seria"
        title="Seria e faturave"
        description="Numri i faturës së fundit të lëshuar këtë vit kalendarik me procesin e vjetër. Sistemi vazhdon nga numri tjetër; miratimi i vazhdimit është hap i veçantë i kontabilistit."
      >
        {!plan ? (
          <Alert tone="info" role="status">
            Ruani fillimisht planin e kalimit.
          </Alert>
        ) : (
          <>
            {series.length > 0 && (
              <ul className="divide-line mb-4 divide-y text-sm">
                {series.map((item) => {
                  const st = SERIES_STATUS_LABELS[item.status] ?? {
                    label: item.status,
                    tone: "neutral" as const,
                  };
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 py-2">
                      <span className="font-semibold">
                        {item.fiscalYear} · {item.code}
                      </span>
                      <span className="text-ink-muted">
                        {item.legacyLastNumber === null
                          ? "Pa fatura të lëshuara këtë vit"
                          : `Fatura e fundit: ${item.legacyLastNumber}`}{" "}
                        · numri i parë në sistem: {item.nextNumber}
                      </span>
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </li>
                  );
                })}
              </ul>
            )}
            {seriesFrozen ? (
              <Alert tone="info" role="status">
                Seria për {year} është vendosur dhe nuk ndryshohet këtu.
              </Alert>
            ) : (
              <ActionForm
                action={proposeSeriesAction}
                idempotencyKey={randomUUID()}
                submitLabel={yearSeries ? "Përditëso propozimin" : "Ruaj propozimin"}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="fiscalYear"
                    label="Viti kalendarik"
                    required
                    inputMode="numeric"
                    defaultValue={String(year)}
                    hint="Duhet të jetë viti i datës së fillimit në sistem."
                  />
                  <FormField
                    name="code"
                    label="Kodi i serisë"
                    required
                    mono
                    defaultValue={yearSeries?.code ?? ""}
                    hint="P.sh. FA. Vetëm shkronja latine, shifra dhe / _ -."
                  />
                  <FormField
                    name="legacyLastNumber"
                    label="Numri i faturës së fundit të lëshuar"
                    inputMode="numeric"
                    defaultValue={
                      yearSeries?.legacyLastNumber != null
                        ? String(yearSeries.legacyLastNumber)
                        : ""
                    }
                    hint={
                      lastExcelYear !== null && lastExcelYear !== year
                        ? "Dita e fundit në Excel është në vit tjetër: konfirmoni më poshtë që nuk ka fatura këtë vit."
                        : "Një numër i plotë, pa presje."
                    }
                  />
                  <FormField
                    name="noInvoicesYet"
                    kind="checkbox"
                    label="Këtë vit nuk është lëshuar asnjë faturë"
                  />
                </div>
              </ActionForm>
            )}
          </>
        )}
      </Section>
    </div>
  );
}
