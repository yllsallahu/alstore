import { ArrowRight, CircleSlash, ClipboardList, FileUp, Package } from "lucide-react";
import Link from "next/link";

import { moduleMetadata } from "@/components/module-placeholder";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata = moduleMetadata("stoku");

export default function StockPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Stoku</h1>
        <StatusBadge tone="warn">Pjesërisht aktiv</StatusBadge>
      </div>
      <p className="text-ink-muted mt-2 max-w-prose">
        Një depo e vetme. Stoku mbahet sipas SKU-së në njësinë kanonike: kg, m² ose copë.
      </p>

      <Link
        href="/stoku/produktet"
        className="group border-line bg-surface hover:border-brand mt-6 flex min-h-24 items-center gap-4 rounded-lg border p-5"
      >
        <span className="bg-brand-soft text-brand flex size-12 shrink-0 items-center justify-center rounded-md">
          <Package aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-lg font-semibold">
            Produktet
            <ArrowRight aria-hidden className="text-ink-muted size-5" />
          </span>
          <span className="text-ink-muted block text-sm">
            Katalogu i SKU-ve: krijo, kërko dhe ndrysho produktet.
          </span>
        </span>
      </Link>

      <Link
        href="/stoku/importi"
        className="group border-line bg-surface hover:border-brand mt-4 flex min-h-24 items-center gap-4 rounded-lg border p-5"
      >
        <span className="bg-brand-soft text-brand flex size-12 shrink-0 items-center justify-center rounded-md">
          <FileUp aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-lg font-semibold">
            Importi i produkteve
            <ArrowRight aria-hidden className="text-ink-muted size-5" />
          </span>
          <span className="text-ink-muted block text-sm">
            Ngarko listën e SKU-ve nga CSV ose XLSX: parashikim, kontrolle dhe miratim.
          </span>
        </span>
      </Link>

      <Link
        href="/stoku/gjendja-fillestare"
        className="group border-line bg-surface hover:border-brand mt-4 flex min-h-24 items-center gap-4 rounded-lg border p-5"
      >
        <span className="bg-brand-soft text-brand flex size-12 shrink-0 items-center justify-center rounded-md">
          <ClipboardList aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-lg font-semibold">
            Gjendja fillestare
            <ArrowRight aria-hidden className="text-ink-muted size-5" />
          </span>
          <span className="text-ink-muted block text-sm">
            Numërimi fizik, rakordimi me Excel-in dhe nënshkrimi i drejtorit.
          </span>
        </span>
      </Link>

      <section
        aria-labelledby="gjendja-bosh"
        className="border-line-strong bg-surface mt-6 rounded-lg border border-dashed px-6 py-10 text-center"
      >
        <CircleSlash aria-hidden className="text-ink-muted mx-auto size-8" />
        <h2 id="gjendja-bosh" className="mt-3 text-base font-semibold">
          Gjendja dhe lëvizjet e stokut ende nuk janë aktive
        </h2>
        <p id="gjendja-ndihme" className="text-ink-muted mx-auto mt-1 max-w-md text-sm">
          Gjendja aktuale dhe lëvizjet do të shfaqen në fazën 05, pasi të regjistrohet stoku
          fillestar i numëruar fizikisht.
        </p>
        <Button className="mt-5" disabled aria-describedby="gjendja-ndihme">
          Shiko gjendjen
        </Button>
      </section>
    </div>
  );
}
