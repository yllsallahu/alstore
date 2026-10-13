import { Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/master-data/page-header";
import { SearchBox } from "@/components/master-data/search-box";
import { Unavailable } from "@/components/master-data/unavailable";
import { VerificationBadge } from "@/components/master-data/verification-badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { IDENTIFIER_SHORT_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { searchCustomers } from "@/server/services/master-data/customers";

export const metadata: Metadata = { title: "Klientët" };

const LIMIT = 50;

function identifierSummary(identifiers: Partial<Record<string, string>>) {
  return Object.entries(identifiers)
    .map(
      ([type, value]) =>
        `${IDENTIFIER_SHORT_LABELS[type as keyof typeof IDENTIFIER_SHORT_LABELS] ?? type} ${value}`,
    )
    .join(" · ");
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const includeInactive = params.joaktive === "on";
  const ctx = await getRequestContext();

  const header = (
    <PageHeader
      title="Klientët"
      description="Vetëm biznese të regjistruara. Fatura tatimore lëshohet vetëm për klientë të verifikuar."
      actions={
        ctx.kind === "ready" ? (
          <>
            <Link
              href="/klientet/rregullat"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <SlidersHorizontal aria-hidden />
              Rregullat e numrave
            </Link>
            <Link href="/klientet/i-ri" className={buttonVariants({ size: "lg" })}>
              <Plus aria-hidden />
              Shto klient
            </Link>
          </>
        ) : undefined
      }
    />
  );
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-6xl">
        {header}
        <Unavailable context={ctx} />
      </div>
    );
  }
  const rows = await searchCustomers(ctx.db, ctx.actor, { q, includeInactive, limit: LIMIT });

  return (
    <div className="mx-auto max-w-6xl">
      {header}
      <SearchBox
        label="Kërko sipas emrit ose numrit identifikues"
        placeholder="p.sh. emri i biznesit ose NUI"
        inactiveLabel="Përfshi klientët jo aktivë"
      />
      <p className="text-ink-muted mt-4 text-sm" aria-live="polite">
        {rows.length === 0
          ? "Asnjë klient."
          : rows.length === LIMIT
            ? `Shfaqen ${LIMIT} të parët. Ngushtoni kërkimin.`
            : `${rows.length} ${rows.length === 1 ? "klient" : "klientë"}.`}
      </p>
      {rows.length === 0 ? (
        <div className="border-line-strong bg-surface mt-3 rounded-lg border border-dashed px-6 py-10 text-center">
          <h2 className="text-base font-semibold">
            {q ? "Nuk u gjet asnjë klient" : "Nuk ka ende klientë"}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            {q ? "Provoni një emër ose numër tjetër." : "Shtoni klientin e parë biznes."}
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/klientet/${row.id}`}
                className="border-line bg-surface hover:border-brand flex min-h-16 flex-col gap-1 rounded-lg border p-4 md:flex-row md:items-center md:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-brand block font-semibold">{row.legalName}</span>
                  <span className="text-ink-muted block font-mono text-sm break-all">
                    {identifierSummary(row.identifiers)}
                  </span>
                </span>
                <span className="text-ink-muted text-sm md:w-32">{row.city ?? "—"}</span>
                <span className="flex flex-wrap gap-1.5 md:w-72 md:justify-end">
                  <VerificationBadge state={row.verification} />
                  {row.billingIncomplete && (
                    <StatusBadge tone="warn">Faturimi i paplotë</StatusBadge>
                  )}
                  {!row.active && <StatusBadge>Jo aktiv</StatusBadge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
