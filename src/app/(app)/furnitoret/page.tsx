import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/master-data/page-header";
import { SearchBox } from "@/components/master-data/search-box";
import { Unavailable } from "@/components/master-data/unavailable";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { COUNTRY_LABELS, IDENTIFIER_SHORT_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { searchSuppliers } from "@/server/services/master-data/suppliers";

export const metadata: Metadata = { title: "Furnitorët" };

const LIMIT = 50;

export default async function SuppliersPage({
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
      title="Furnitorët"
      description="Furnitorë nga Kosova dhe Shqipëria. Faturat e tyre regjistrohen në euro."
      actions={
        ctx.kind === "ready" ? (
          <Link href="/furnitoret/i-ri" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden />
            Shto furnitor
          </Link>
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
  const rows = await searchSuppliers(ctx.db, ctx.actor, { q, includeInactive, limit: LIMIT });
  return (
    <div className="mx-auto max-w-6xl">
      {header}
      <SearchBox
        label="Kërko sipas emrit, NUI-së ose NIPT-it"
        placeholder="p.sh. emri i furnitorit"
        inactiveLabel="Përfshi furnitorët jo aktivë"
      />
      <p className="text-ink-muted mt-4 text-sm" aria-live="polite">
        {rows.length === 0
          ? "Asnjë furnitor."
          : rows.length === LIMIT
            ? `Shfaqen ${LIMIT} të parët. Ngushtoni kërkimin.`
            : `${rows.length} ${rows.length === 1 ? "furnitor" : "furnitorë"}.`}
      </p>
      {rows.length === 0 ? (
        <div className="border-line-strong bg-surface mt-3 rounded-lg border border-dashed px-6 py-10 text-center">
          <h2 className="text-base font-semibold">
            {q ? "Nuk u gjet asnjë furnitor" : "Nuk ka ende furnitorë"}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            {q ? "Provoni një emër ose numër tjetër." : "Shtoni furnitorin e parë."}
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/furnitoret/${row.id}`}
                className="border-line bg-surface hover:border-brand flex min-h-16 flex-col gap-1 rounded-lg border p-4 md:flex-row md:items-center md:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-brand block font-semibold">{row.legalName}</span>
                  <span className="text-ink-muted block font-mono text-sm break-all">
                    {Object.entries(row.identifiers)
                      .map(
                        ([type, value]) =>
                          `${IDENTIFIER_SHORT_LABELS[type as keyof typeof IDENTIFIER_SHORT_LABELS] ?? type} ${value}`,
                      )
                      .join(" · ")}
                  </span>
                </span>
                <span className="text-ink-muted text-sm md:w-40">
                  {COUNTRY_LABELS[row.country as keyof typeof COUNTRY_LABELS]}
                  {row.city ? ` · ${row.city}` : ""}
                </span>
                <span className="flex gap-1.5 md:w-24 md:justify-end">
                  <StatusBadge tone="info">EUR</StatusBadge>
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
