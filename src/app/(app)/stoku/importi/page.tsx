import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm, FormField } from "@/components/forms/action-form";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { Unavailable } from "@/components/master-data/unavailable";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant } from "@/lib/dates";
import { IMPORT_KIND_LABELS, IMPORT_STATUS_LABELS } from "@/lib/opening-labels";
import { getRequestContext } from "@/server/auth/session";
import { IMPORT_FILE_LIMIT_MB, listImportBatches } from "@/server/services/imports/import-batches";

import { uploadProductImportAction } from "./actions";

export const metadata: Metadata = { title: "Importi i produkteve" };

export default async function ImportsPage() {
  const ctx = await getRequestContext();
  const crumbs = [{ href: "/stoku", label: "Stoku" }];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Importi i produkteve" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }
  const batches = await listImportBatches(ctx.db, ctx.actor);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Importi i produkteve"
        description="Ngarkoni listën e SKU-ve nga CSV ose XLSX. Fillimisht shihni vetëm një parashikim; asgjë nuk krijohet para miratimit."
        crumbs={crumbs}
      />

      <Section
        id="ngarko"
        title="Ngarko skedar"
        description={`Maksimumi ${IMPORT_FILE_LIMIT_MB} MB dhe 2 000 rreshta. Formulat në XLSX nuk lexohen: ruajeni si vlera. Njësitë lejohen vetëm kg, m² ose copë.`}
      >
        <ActionForm
          action={uploadProductImportAction}
          idempotencyKey={randomUUID()}
          submitLabel="Ngarko dhe shiko parashikimin"
          pendingLabel="Duke lexuar skedarin…"
        >
          <FormField
            name="file"
            kind="file"
            label="Skedari (CSV ose XLSX)"
            accept=".csv,.xlsx,text/csv"
            required
            hint="Rreshti i parë duhet të ketë titujt: SKU, Emri, Kategoria, Njësia (barkodi dhe çmimi referues janë opsionalë)."
          />
        </ActionForm>
      </Section>

      <Section id="historiku" title="Importet e mëparshme">
        {batches.length === 0 ? (
          <p className="text-ink-muted text-sm">Asnjë import ende.</p>
        ) : (
          <ul className="divide-line divide-y">
            {batches.map((batch) => {
              const status = IMPORT_STATUS_LABELS[batch.status] ?? {
                label: batch.status,
                tone: "neutral" as const,
              };
              return (
                <li
                  key={batch.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Link
                    href={`/stoku/importi/${batch.id}`}
                    className="text-brand min-w-0 flex-1 font-medium underline-offset-2 hover:underline"
                  >
                    <span className="break-all">{batch.fileName}</span>
                  </Link>
                  <span className="text-ink-muted text-sm">
                    {IMPORT_KIND_LABELS[batch.kind] ?? batch.kind} · {batch.rowCount} rreshta ·{" "}
                    {formatInstant(batch.createdAt)}
                  </span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
