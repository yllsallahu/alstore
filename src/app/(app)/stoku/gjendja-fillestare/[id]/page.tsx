import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, FormField } from "@/components/forms/action-form";
import { AuditHistory } from "@/components/master-data/audit-history";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant, formatLocalDate } from "@/lib/dates";
import { formatDecimal } from "@/lib/decimal";
import { UNIT_LABELS } from "@/lib/master-data-labels";
import { OPENING_LINE_LABELS, OPENING_STATUS_LABELS } from "@/lib/opening-labels";
import { getRequestContext } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getOpeningBatch } from "@/server/services/opening/opening-stock";

import {
  markCountedAction,
  reconcileOpeningAction,
  removeOpeningLineAction,
  reopenOpeningAction,
  saveOpeningLineAction,
  signOffOpeningAction,
  uploadCountSheetAction,
} from "../actions";

export const metadata: Metadata = { title: "Numërimi fillestar" };

const FILTERS = { te: "ALL", sasi: "QTY", zero: "ZERO", panjohur: "UNKNOWN" } as const;

export default async function OpeningBatchPage({
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
    { href: "/stoku/gjendja-fillestare", label: "Gjendja fillestare" },
  ];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Numërimi fillestar" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }

  let data;
  try {
    data = await getOpeningBatch(ctx.db, ctx.actor, id, { filter: FILTERS[filterKey], limit: 300 });
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { batch, plan, lines, shownLines, counts, linesHash, history } = data;
  const status = OPENING_STATUS_LABELS[batch.status] ?? {
    label: batch.status,
    tone: "neutral" as const,
  };
  const role = ctx.actor.role;
  const draft = batch.status === "DRAFT";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Numërimi fillestar"
        description={`Numërimi fizik i rakorduar me ditën e fundit në Excel (${formatLocalDate(batch.countedAsOf)}). Kalimi në sistem: ${formatLocalDate(plan?.plannedCutoverDate)}.`}
        crumbs={crumbs}
        badges={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      />
      <SavedNotice code={typeof query.ruajtur === "string" ? query.ruajtur : undefined} />

      <Alert tone="warn" role="note" className="mb-4" title="Vetëm numërim fizik">
        Futni vetëm sasitë e numëruara fizikisht në depo. Mos përdorni listën e stokut nga Excel,
        totale alumin/PVC ose totale faturash. Zero e verifikuar dhe «e panjohur» janë dy gjëra të
        ndryshme: një SKU e panjohur mbetet e bllokuar për shitje.
      </Alert>

      <section aria-label="Përmbledhja" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Rreshta", counts.total],
          ["Me sasi", counts.verifiedQty],
          ["Zero e verifikuar", counts.verifiedZero],
          ["E panjohur", counts.unknown],
          ["Produkte pa verifikim", counts.unverifiedProducts],
        ].map(([label, value]) => (
          <div key={String(label)} className="border-line bg-surface rounded-lg border p-4">
            <p className="text-ink-muted text-sm">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>
      <p className="text-ink-muted mt-2 text-sm">
        Të gjitha produktet pa gjendje të verifikuar (zero ose sasi) mbeten të bllokuara për shitje
        pas nënshkrimit. Produktet e reja pas regjistrimit pranohen normalisht.
      </p>

      {draft && (
        <>
          <Section
            id="rresht"
            title="Shto ose ndrysho një rresht"
            description="Shkruani SKU-në dhe numërimin e verifikuar. SKU duhet të ekzistojë tashmë te Produktet."
          >
            <ActionForm
              action={saveOpeningLineAction}
              idempotencyKey={randomUUID()}
              hidden={{ batchId: batch.id }}
              submitLabel="Ruaj rreshtin"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField name="sku" label="SKU" required mono />
                <FormField
                  name="status"
                  kind="select"
                  label="Gjendja e numërimit"
                  required
                  options={[
                    { value: "VERIFIED_QTY", label: "Sasi e verifikuar" },
                    { value: "VERIFIED_ZERO", label: "Zero e verifikuar" },
                    { value: "UNKNOWN", label: "E panjohur (e pa-verifikuar)" },
                  ]}
                />
                <FormField
                  name="quantity"
                  label="Sasia (vetëm për «Sasi e verifikuar»)"
                  inputMode="decimal"
                  hint="Deri në 3 shifra pas presjes, p.sh. 12,5. Njësia është ajo e produktit."
                />
                <FormField name="evidence" label="Shënim numërimi (opsional)" />
              </div>
            </ActionForm>
          </Section>

          <Section
            id="ngarko"
            title="Ngarko fletën e numërimit"
            description="CSV ose XLSX me kolonat SKU, Njësia, Sasia. Fillimisht shihni parashikimin; asgjë nuk futet para miratimit."
          >
            <ActionForm
              action={uploadCountSheetAction}
              idempotencyKey={randomUUID()}
              hidden={{ targetOpeningBatchId: batch.id }}
              submitLabel="Ngarko dhe shiko parashikimin"
              variant="secondary"
              pendingLabel="Duke lexuar skedarin…"
            >
              <FormField
                name="file"
                kind="file"
                label="Skedari"
                accept=".csv,.xlsx,text/csv"
                required
              />
            </ActionForm>
          </Section>
        </>
      )}

      <Section id="veprimi" title="Hapi tjetër">
        {draft && (
          <ActionForm
            action={markCountedAction}
            idempotencyKey={randomUUID()}
            hidden={{ batchId: batch.id }}
            submitLabel="Numërimi përfundoi"
            pendingLabel="Duke ruajtur…"
            confirmNote={
              <p className="text-ink-muted text-sm">
                Rreshtat ngrijnë. Mund t&apos;i hapni përsëri para rakordimit.
              </p>
            }
          />
        )}
        {batch.status === "COUNTED" && (
          <div className="flex flex-col gap-6">
            {role === "ACCOUNTANT" ? (
              <ActionForm
                action={reconcileOpeningAction}
                idempotencyKey={randomUUID()}
                hidden={{ batchId: batch.id }}
                submitLabel="Regjistro rakordimin"
                pendingLabel="Duke regjistruar…"
              >
                <FormField
                  name="note"
                  kind="textarea"
                  label="Si u rakordua numërimi me ditën e fundit në Excel?"
                  required
                  hint="Të paktën 10 shenja: p.sh. diferencat e gjetura dhe si u sqaruan."
                />
              </ActionForm>
            ) : (
              <Alert tone="info" role="status">
                Rakordimin me Excel-in e bën kontabilisti.
              </Alert>
            )}
            <ActionForm
              action={reopenOpeningAction}
              idempotencyKey={randomUUID()}
              hidden={{ batchId: batch.id }}
              submitLabel="Hap numërimin përsëri"
              variant="secondary"
            />
          </div>
        )}
        {batch.status === "RECONCILED" && (
          <div className="flex flex-col gap-6">
            <Alert tone="info" role="status" title="Rakordimi u regjistrua">
              {batch.reconciledAt && <p>{formatInstant(batch.reconciledAt)}</p>}
              <p>{batch.reconciliationNote}</p>
            </Alert>
            {role === "DIRECTOR" ? (
              <ActionForm
                action={signOffOpeningAction}
                idempotencyKey={randomUUID()}
                hidden={{ batchId: batch.id, expectedLinesHash: linesHash }}
                submitLabel="Nënshkruaj dhe regjistro gjendjen fillestare"
                pendingLabel="Duke regjistruar…"
              >
                <Alert tone="warn" role="note" title="Ky veprim nuk kthehet">
                  Gjendja fillestare regjistrohet në stok me datën e kalimit (
                  {formatLocalDate(plan?.plannedCutoverDate)}) dhe plani i kalimit mbyllet.
                  Ndryshimet pas kësaj bëhen vetëm me rregullim të miratuar.
                </Alert>
                <FormField
                  name="acknowledgedUnknownCount"
                  label={`Konfirmoni numrin e produkteve pa gjendje të verifikuar: ${counts.unverifiedProducts}`}
                  required
                  inputMode="numeric"
                  hint="Ato mbeten të bllokuara për shitje derisa të verifikohen."
                />
              </ActionForm>
            ) : (
              <Alert tone="info" role="status">
                Nënshkrimin e bën drejtori, një përdorues tjetër nga ai që e rakordoi.
              </Alert>
            )}
            <ActionForm
              action={reopenOpeningAction}
              idempotencyKey={randomUUID()}
              hidden={{ batchId: batch.id }}
              submitLabel="Anulo rakordimin"
              variant="secondary"
            />
          </div>
        )}
        {(batch.status === "SIGNED_OFF" || batch.status === "POSTED") && (
          <Alert tone="success" role="status" title="Gjendja fillestare është e regjistruar">
            {batch.signedOffAt && <p>Nënshkruar më {formatInstant(batch.signedOffAt)}.</p>}
            <p>Produkte të pa-verifikuara të pranuara: {batch.unknownAcknowledgedCount}.</p>
          </Alert>
        )}
      </Section>

      <Section
        id="rreshtat"
        title="Rreshtat e numërimit"
        description={`Shfaqen ${shownLines} nga ${counts.total}.`}
      >
        <nav aria-label="Filtri i rreshtave" className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["te", "Të gjitha"],
              ["sasi", "Me sasi"],
              ["zero", "Zero"],
              ["panjohur", "E panjohur"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={`/stoku/gjendja-fillestare/${batch.id}?filtri=${key}`}
              aria-current={filterKey === key ? "page" : undefined}
              className={`inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium ${filterKey === key ? "border-brand bg-brand-soft text-brand" : "border-line-strong"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {lines.length === 0 ? (
          <p className="text-ink-muted text-sm">Asnjë rresht.</p>
        ) : (
          <ul className="divide-line divide-y">
            {lines.map((line) => {
              const lineStatus = OPENING_LINE_LABELS[line.status];
              return (
                <li
                  key={line.productId}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold">{line.sku}</p>
                    <p className="text-ink-muted text-sm break-words">{line.name}</p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {line.quantity === null
                      ? "—"
                      : `${formatDecimal(line.quantity, 3)} ${UNIT_LABELS[line.unit as keyof typeof UNIT_LABELS] ?? line.unit}`}
                  </p>
                  {lineStatus && (
                    <StatusBadge tone={lineStatus.tone}>{lineStatus.label}</StatusBadge>
                  )}
                  {draft && (
                    <ActionForm
                      action={removeOpeningLineAction}
                      idempotencyKey={randomUUID()}
                      hidden={{ batchId: batch.id, productId: line.productId }}
                      submitLabel="Hiq"
                      variant="secondary"
                      pendingLabel="Duke hequr…"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="historia" title="Historiku">
        <AuditHistory items={history} />
      </Section>
    </div>
  );
}
