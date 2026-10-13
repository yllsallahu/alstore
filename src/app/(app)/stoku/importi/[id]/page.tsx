import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, FormField } from "@/components/forms/action-form";
import { MappingForm } from "@/components/import/mapping-form";
import { AuditHistory } from "@/components/master-data/audit-history";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant } from "@/lib/dates";
import type { ColumnMapping } from "@/lib/import/fields";
import { IMPORT_KIND_LABELS, IMPORT_STATUS_LABELS, ROW_STATUS_LABELS } from "@/lib/opening-labels";
import { getRequestContext } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getImportBatch } from "@/server/services/imports/import-batches";

import { approveImportAction, rejectImportAction, remapImportAction } from "../actions";

export const metadata: Metadata = { title: "Importi" };

const FILTERS = {
  te: "ALL",
  gabime: "ERRORS",
  paralajmerime: "WARNINGS",
} as const;

export default async function ImportBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const filterKey =
    typeof query.filtri === "string" && query.filtri in FILTERS
      ? (query.filtri as keyof typeof FILTERS)
      : "te";
  const ctx = await getRequestContext();
  const crumbs = [
    { href: "/stoku", label: "Stoku" },
    { href: "/stoku/importi", label: "Importi" },
  ];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Importi" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }

  let data;
  try {
    data = await getImportBatch(ctx.db, ctx.actor, id, { filter: FILTERS[filterKey], limit: 300 });
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { batch, kind, fields, rows, shownRows, history } = data;
  const headers = batch.headers as string[];
  const mapping = batch.columnMapping as ColumnMapping;
  const decided = batch.status === "APPROVED" || batch.status === "REJECTED";
  const status = IMPORT_STATUS_LABELS[batch.status] ?? {
    label: batch.status,
    tone: "neutral" as const,
  };
  const isOpening = kind === "OPENING_STOCK";
  const backHref =
    isOpening && batch.targetOpeningBatchId
      ? `/stoku/gjendja-fillestare/${batch.targetOpeningBatchId}`
      : "/stoku/importi";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={<span className="break-all">{batch.fileName}</span>}
        description={`${IMPORT_KIND_LABELS[kind]} · ${batch.fileFormat} · ${formatInstant(batch.createdAt)}`}
        crumbs={isOpening ? [...crumbs, { href: backHref, label: "Gjendja fillestare" }] : crumbs}
        badges={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      />
      <SavedNotice code={typeof query.ruajtur === "string" ? query.ruajtur : undefined} />

      {isOpening && !decided && (
        <Alert
          tone="warn"
          role="note"
          className="mb-4"
          title="Kjo duhet të jetë fleta e numërimit fizik"
        >
          Ngarkoni numërimin e bërë fizikisht në depo, jo listën e stokut nga Excel dhe jo totale
          nga faturat. Një qelizë e zbrazët do të thotë «e panjohur», jo zero; zero shkruhet
          shprehimisht me 0.
        </Alert>
      )}
      {!decided && (
        <Alert tone="info" role="note" className="mb-4">
          Ky është vetëm parashikim. Deri në miratim nuk është krijuar asnjë{" "}
          {isOpening ? "rresht numërimi dhe asnjë lëvizje stoku" : "produkt"}.
        </Alert>
      )}

      <section aria-label="Përmbledhja" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Rreshta", batch.rowCount, "neutral"],
          ["Në rregull", batch.validCount, "success"],
          ["Paralajmërime", batch.warningCount, "warn"],
          ["Gabime", batch.errorCount, "danger"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="border-line bg-surface rounded-lg border p-4">
            <p className="text-ink-muted text-sm">{label}</p>
            <p
              className={`text-2xl font-semibold tabular-nums ${tone === "danger" && Number(value) > 0 ? "text-danger" : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </section>

      {decided && (
        <Alert
          tone={batch.status === "APPROVED" ? "success" : "info"}
          role="status"
          className="mt-4"
          title={
            batch.status === "APPROVED"
              ? `Miratuar: ${batch.approvedRowCount} rreshta u zbatuan`
              : "Refuzuar"
          }
        >
          {batch.decidedAt && <p>{formatInstant(batch.decidedAt)}</p>}
          {batch.decisionNote && <p>{batch.decisionNote}</p>}
        </Alert>
      )}

      {!decided && (
        <Section
          id="kolonat"
          title="Kolonat e skedarit"
          description="Çdo fushë lidhet me një kolonë sipas titullit. Kontrolloni dhe ndryshoni nëse duhet; parashikimi rifreskohet."
        >
          <MappingForm
            action={remapImportAction}
            idempotencyKey={randomUUID()}
            batchId={batch.id}
            headers={headers}
            fields={fields.map((f) => ({
              key: f.key,
              label: f.label,
              required: f.required,
              hint: f.hint,
            }))}
            mapping={mapping}
          />
        </Section>
      )}

      <Section
        id="rreshtat"
        title="Rreshtat"
        description={`Shfaqen ${shownRows} nga ${batch.rowCount}. Gabimet shfaqen të parat.`}
      >
        <nav aria-label="Filtri i rreshtave" className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["te", "Të gjitha"],
              ["gabime", "Vetëm gabimet"],
              ["paralajmerime", "Vetëm paralajmërimet"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={`/stoku/importi/${batch.id}?filtri=${key}`}
              aria-current={filterKey === key ? "page" : undefined}
              className={`inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium ${filterKey === key ? "border-brand bg-brand-soft text-brand" : "border-line-strong"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? (
          <p className="text-ink-muted text-sm">Asnjë rresht për këtë filtër.</p>
        ) : (
          <ul className="divide-line divide-y">
            {rows.map((row) => {
              const rowStatus = ROW_STATUS_LABELS[row.status as keyof typeof ROW_STATUS_LABELS];
              return (
                <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                  <span className="text-ink-muted w-24 shrink-0 text-sm tabular-nums">
                    Rreshti {row.rowNo}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-mono break-words">{row.raw.slice(0, 6).join(" | ")}</p>
                    {row.issues.length > 0 && (
                      <ul className="mt-1 list-disc pl-5">
                        {row.issues.map((issue, index) => (
                          <li
                            key={index}
                            className={issue.severity === "ERROR" ? "text-danger" : "text-warn"}
                          >
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {rowStatus && <StatusBadge tone={rowStatus.tone}>{rowStatus.label}</StatusBadge>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {!decided && (
        <Section id="miratimi" title="Vendimi">
          {batch.errorCount > 0 && (
            <Alert
              tone="warn"
              role="status"
              className="mb-4"
              title={`${batch.errorCount} rreshta kanë gabime`}
            >
              Miratimi i plotë nuk lejohet. Korrigjoni skedarin dhe ngarkojeni përsëri, ose miratoni
              vetëm rreshtat pa gabime dhe shkruani numrin e rreshtave që përjashtohen.
            </Alert>
          )}
          {batch.previewHash ? (
            <ActionForm
              action={approveImportAction}
              idempotencyKey={randomUUID()}
              hidden={{ batchId: batch.id, expectedPreviewHash: batch.previewHash }}
              submitLabel="Mirato importin"
              pendingLabel="Duke miratuar…"
            >
              <FormField
                name="mode"
                kind="select"
                label="Mënyra e miratimit"
                required
                defaultValue={batch.errorCount > 0 ? "REVIEWED_PARTIAL" : "ALL_OR_NOTHING"}
                options={[
                  { value: "ALL_OR_NOTHING", label: "Miratim i plotë (të gjitha ose asgjë)" },
                  {
                    value: "REVIEWED_PARTIAL",
                    label: "Miratim i rishikuar pjesërisht (pa rreshtat me gabime)",
                  },
                ]}
              />
              {batch.errorCount > 0 && (
                <FormField
                  name="acknowledgedErrorRows"
                  label={`Shkruani numrin e rreshtave që përjashtohen (${batch.errorCount})`}
                  inputMode="numeric"
                  hint="Konfirmon që i keni parë rreshtat me gabime dhe që nuk do të importohen."
                />
              )}
              {batch.warningCount > 0 && (
                <FormField
                  name="acknowledgeWarnings"
                  kind="checkbox"
                  label={`I kam parë ${batch.warningCount} paralajmërimet`}
                />
              )}
              <FormField name="note" kind="textarea" label="Shënim (opsional)" />
            </ActionForm>
          ) : (
            <p className="text-ink-muted text-sm">Parashikimi nuk është gati.</p>
          )}
          <div className="border-line mt-6 border-t pt-6">
            <h3 className="mb-3 text-base font-semibold">Refuzo importin</h3>
            <ActionForm
              action={rejectImportAction}
              idempotencyKey={randomUUID()}
              hidden={{ batchId: batch.id }}
              submitLabel="Refuzo"
              variant="secondary"
              pendingLabel="Duke refuzuar…"
            >
              <FormField name="note" kind="textarea" label="Arsyeja e refuzimit" required />
            </ActionForm>
          </div>
        </Section>
      )}

      <Section id="historia" title="Historiku">
        <AuditHistory items={history} />
      </Section>
    </div>
  );
}
