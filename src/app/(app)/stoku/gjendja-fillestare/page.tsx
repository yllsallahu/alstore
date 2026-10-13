import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/forms/action-form";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDate } from "@/lib/dates";
import { OPENING_STATUS_LABELS } from "@/lib/opening-labels";
import { getRequestContext } from "@/server/auth/session";
import { getCutoverOverview } from "@/server/services/cutover/cutover";

import { createOpeningBatchAction } from "./actions";

export const metadata: Metadata = { title: "Gjendja fillestare" };

export default async function OpeningStockPage() {
  const ctx = await getRequestContext();
  const crumbs = [{ href: "/stoku", label: "Stoku" }];
  const header = (
    <PageHeader
      title="Gjendja fillestare"
      description="Stoku fillestar vjen vetëm nga numërimi fizik në depo, i rakorduar me ditën e fundit në Excel dhe i nënshkruar nga drejtori. Nuk nxirret nga totalet e alumin/PVC dhe as nga faturat."
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
  const { plan, batch } = await getCutoverOverview(ctx.db, ctx.actor);

  return (
    <div className="mx-auto max-w-4xl">
      {header}
      {!plan ? (
        <Alert tone="warn" role="status" title="Plani i kalimit mungon">
          Para numërimit duhet të ruani datën e fillimit në sistem dhe ditën e fundit në Excel.{" "}
          <Link href="/cilesimet/kalimi" className="font-semibold underline">
            Hap planin e kalimit
          </Link>
        </Alert>
      ) : (
        <Section
          id="plani"
          title="Numërimi fillestar"
          description={`Dita e fundit në Excel: ${formatLocalDate(plan.lastExcelDay)} · Fillimi në sistem: ${formatLocalDate(plan.plannedCutoverDate)}`}
        >
          {batch ? (
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={OPENING_STATUS_LABELS[batch.status]?.tone ?? "neutral"}>
                {OPENING_STATUS_LABELS[batch.status]?.label ?? batch.status}
              </StatusBadge>
              <Link
                href={`/stoku/gjendja-fillestare/${batch.id}`}
                className={buttonVariants({ size: "lg" })}
              >
                Hap numërimin
              </Link>
            </div>
          ) : plan.status === "DRAFT" ? (
            <ActionForm
              action={createOpeningBatchAction}
              idempotencyKey={randomUUID()}
              submitLabel="Fillo numërimin fillestar"
              pendingLabel="Duke krijuar…"
            />
          ) : (
            <p className="text-ink-muted text-sm">Plani është i mbyllur.</p>
          )}
        </Section>
      )}
    </div>
  );
}
