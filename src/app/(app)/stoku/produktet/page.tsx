import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/master-data/page-header";
import { SearchBox } from "@/components/master-data/search-box";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDecimal } from "@/lib/decimal";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { listPendingUnitChanges, searchProducts } from "@/server/services/master-data/products";

export const metadata: Metadata = { title: "Produktet" };

const LIMIT = 50;

export default async function ProductsPage({
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
      title="Produktet"
      description="Katalogu i SKU-ve me njësinë kanonike (kg, m² ose copë). Gjendja e stokut shfaqet pas importit të stokut fillestar."
      crumbs={[{ href: "/stoku", label: "Stoku" }]}
      actions={
        ctx.kind === "ready" ? (
          <Link href="/stoku/produktet/i-ri" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden />
            Shto produkt
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

  const [rows, pending] = await Promise.all([
    searchProducts(ctx.db, ctx.actor, { q, includeInactive, limit: LIMIT }),
    listPendingUnitChanges(ctx.db, ctx.actor),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      {header}
      {pending.length > 0 && (
        <Alert
          tone="warn"
          role="status"
          className="mb-4"
          title="Kërkesa për ndryshim njësie në pritje"
        >
          <ul className="mt-1 list-disc pl-5">
            {pending.map((change) => (
              <li key={change.id}>
                <Link href={`/stoku/produktet/${change.productId}`} className="underline">
                  {change.sku}
                </Link>
                : {UNIT_LABELS[change.fromUnit as keyof typeof UNIT_LABELS]} →{" "}
                {UNIT_LABELS[change.toUnit as keyof typeof UNIT_LABELS]}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <SearchBox
        label="Kërko sipas SKU-së, emrit ose barkodit"
        placeholder="p.sh. AL-120 ose profil"
        inactiveLabel="Përfshi produktet jo aktive"
      />

      <p className="text-ink-muted mt-4 text-sm" aria-live="polite">
        {rows.length === 0
          ? "Asnjë produkt."
          : rows.length === LIMIT
            ? `Shfaqen ${LIMIT} të parët. Ngushtoni kërkimin për të gjetur të tjerët.`
            : `${rows.length} ${rows.length === 1 ? "produkt" : "produkte"}.`}
      </p>

      {rows.length === 0 ? (
        <div className="border-line-strong bg-surface mt-3 rounded-lg border border-dashed px-6 py-10 text-center">
          <h2 className="text-base font-semibold">
            {q ? "Nuk u gjet asnjë produkt" : "Katalogu është bosh"}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">
            {q ? "Provoni një SKU ose emër tjetër." : "Shtoni produktin e parë me SKU-në e tij."}
          </p>
        </div>
      ) : (
        <>
          <table className="border-line bg-surface mt-3 hidden w-full overflow-hidden rounded-lg border text-sm md:table">
            <thead className="bg-canvas text-ink-muted text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  SKU
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Emri
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Kategoria
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Njësia
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Çmimi ref. (EUR)
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Statusi
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/stoku/produktet/${row.id}`}
                      className="text-brand font-semibold underline-offset-2 hover:underline"
                    >
                      {row.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    {CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS]}
                  </td>
                  <td className="px-4 py-3">{UNIT_LABELS[row.unit as keyof typeof UNIT_LABELS]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatDecimal(row.referencePurchasePrice, 3)}
                  </td>
                  <td className="px-4 py-3">
                    {row.active ? (
                      <StatusBadge tone="success">Aktiv</StatusBadge>
                    ) : (
                      <StatusBadge>Jo aktiv</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="mt-3 flex flex-col gap-2 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/stoku/produktet/${row.id}`}
                  className="border-line bg-surface hover:border-brand flex min-h-16 flex-col gap-1 rounded-lg border p-4"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-brand font-mono font-semibold">{row.sku}</span>
                    {row.active ? (
                      <StatusBadge tone="success">Aktiv</StatusBadge>
                    ) : (
                      <StatusBadge>Jo aktiv</StatusBadge>
                    )}
                  </span>
                  <span className="text-base">{row.name}</span>
                  <span className="text-ink-muted text-sm">
                    {CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                    {UNIT_LABELS[row.unit as keyof typeof UNIT_LABELS]}
                    {row.referencePurchasePrice &&
                      ` · ${formatDecimal(row.referencePurchasePrice, 3)} EUR`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
