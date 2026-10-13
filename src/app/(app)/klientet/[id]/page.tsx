import { randomUUID } from "node:crypto";

import { CircleCheck, CircleX } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuditHistory } from "@/components/master-data/audit-history";
import { CustomerForm } from "@/components/master-data/customer-form";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { SuspensionForm } from "@/components/master-data/simple-forms";
import { Unavailable } from "@/components/master-data/unavailable";
import { VerificationBadge } from "@/components/master-data/verification-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant, formatLocalDate } from "@/lib/dates";
import { VERIFICATION_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getCustomer } from "@/server/services/master-data/customers";
import { listFormatRules } from "@/server/services/master-data/identifier-rules";

import { suspendCustomerAction, updateCustomerAction } from "../actions";

export const metadata: Metadata = { title: "Klienti" };

const METHOD_LABELS: Record<string, string> = {
  FORMAT_CHECK: "Kontroll formati (automatik)",
  MANUAL_EVIDENCE: "Kontroll manual me dëshmi",
  SUSPENSION: "Pezullim",
  REINSTATEMENT: "Heqje e pezullimit",
};

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const saved = (await searchParams).ruajtur;
  const ctx = await getRequestContext();
  const crumbs = [{ href: "/klientet", label: "Klientët" }];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Klienti" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }

  let data;
  try {
    data = await getCustomer(ctx.db, ctx.actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const rules = (await listFormatRules(ctx.db, ctx.actor)).filter(
    (rule) => rule.status === "ACTIVE",
  );
  const { customer, derived, eligibility, verifications, history } = data;
  const suspended = derived.state === "SUSPENDED";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={customer.legalName}
        crumbs={crumbs}
        badges={
          <>
            <VerificationBadge state={derived.state} />
            {!customer.active && <StatusBadge>Jo aktiv</StatusBadge>}
          </>
        }
      />
      <SavedNotice code={typeof saved === "string" ? saved : undefined} />

      <div
        role="status"
        className={
          eligibility.eligible
            ? "border-success/30 bg-success-soft text-success rounded-lg border p-4"
            : "border-line bg-surface rounded-lg border p-4"
        }
      >
        <p className="flex items-center gap-2 font-semibold">
          {eligibility.eligible ? (
            <CircleCheck aria-hidden className="size-5" />
          ) : (
            <CircleX aria-hidden className="text-danger size-5" />
          )}
          {eligibility.eligible
            ? "Mund të marrë faturë tatimore"
            : "Nuk mund të marrë faturë tatimore"}
        </p>
        {eligibility.reasons.length > 0 && (
          <ul className="text-ink mt-2 list-disc space-y-1 pl-6 text-sm">
            {eligibility.reasons.map((reason) => (
              <li key={reason.code}>{reason.message}</li>
            ))}
          </ul>
        )}
      </div>

      <Section title="Të dhënat e biznesit" description="Fushat me * janë të detyrueshme.">
        <CustomerForm
          key={customer.version}
          mode="edit"
          action={updateCustomerAction}
          idempotencyKey={randomUUID()}
          customerId={customer.id}
          version={customer.version}
          cancelHref="/klientet"
          rules={rules}
          defaults={{
            legalName: customer.legalName,
            identifiers: customer.identifiers,
            address: customer.address ?? "",
            city: customer.city ?? "",
            active: customer.active,
          }}
        />
        <p className="text-ink-muted mt-3 text-sm">
          Ndryshimi i emrit ligjor ose i numrave identifikues e bën verifikimin e mëparshëm të
          pavlefshëm. Ndryshimi i adresës nuk e prek verifikimin.
        </p>
      </Section>

      <Section
        id="verifikimi"
        title="Verifikimi i identitetit"
        description={VERIFICATION_LABELS[derived.state].hint}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Gjendja</dt>
            <dd className="mt-1">
              <VerificationBadge state={derived.state} />
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Kontrolli në regjistrin zyrtar</dt>
            <dd className="mt-1">
              Nuk bëhet: nuk ekziston lidhje e besueshme me regjistrin zyrtar të bizneseve.
            </dd>
          </div>
          {derived.lastManual && (
            <div>
              <dt className="text-ink-muted">Kontrolli i fundit manual</dt>
              <dd className="mt-1">
                {formatInstant(derived.lastManual.verifiedAt)}
                {derived.lastManual.validUntil &&
                  ` · i vlefshëm deri më ${formatLocalDate(derived.lastManual.validUntil)}`}
                {derived.expired && " · ka skaduar"}
              </dd>
            </div>
          )}
        </dl>

        {!suspended && (
          <div className="mt-5">
            <h3 className="font-semibold">Kontroll manual me dëshmi</h3>
            <Alert tone="warn" role="note" className="mt-2">
              Kontrolli manual regjistrohet vetëm bashkë me dokumentin e dëshmisë (p.sh.
              certifikatën e regjistrimit), i ruajtur në hapësirën private të dokumenteve. Kjo
              hapësirë nuk është aktivizuar ende, prandaj kontrolli manual nuk mund të regjistrohet
              nga kjo faqe.
            </Alert>
            <Button className="mt-3" size="lg" disabled aria-describedby="verifikimi-titulli">
              Regjistro kontrollin manual
            </Button>
          </div>
        )}

        <div className="border-line mt-6 border-t pt-5">
          <h3 className="font-semibold">{suspended ? "Hiq pezullimin" : "Pezullo verifikimin"}</h3>
          <div className="mt-3">
            <SuspensionForm
              key={`${derived.state}-${verifications.length}`}
              action={suspendCustomerAction}
              customerId={customer.id}
              idempotencyKey={randomUUID()}
              mode={suspended ? "reinstate" : "suspend"}
            />
          </div>
        </div>
      </Section>

      <Section title="Historiku i verifikimeve" description="Regjistër i pandryshueshëm.">
        {verifications.length === 0 ? (
          <p className="text-ink-muted text-sm">Nuk ka ende kontrolle.</p>
        ) : (
          <ol className="divide-line divide-y text-sm">
            {verifications.map((v) => (
              <li key={v.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
                <time className="text-ink-muted shrink-0 tabular-nums sm:w-36">
                  {formatInstant(v.verifiedAt)}
                </time>
                <div className="min-w-0">
                  <p className="font-medium">
                    {METHOD_LABELS[v.method] ?? v.method}
                    {(v.method === "MANUAL_EVIDENCE" || v.method === "FORMAT_CHECK") &&
                      (v.result === "PASSED" ? " · kaloi" : " · nuk kaloi")}
                  </p>
                  {v.note && <p className="break-words">{v.note}</p>}
                  {!v.current &&
                    (v.method === "MANUAL_EVIDENCE" || v.method === "FORMAT_CHECK") && (
                      <p className="text-ink-muted">
                        Për emrin ose numrat e mëparshëm: nuk vlen më.
                      </p>
                    )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Historiku i ndryshimeve">
        <AuditHistory items={history} />
      </Section>
    </div>
  );
}
