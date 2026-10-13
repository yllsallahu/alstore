import { ArrowRight, CalendarCheck, CircleSlash } from "lucide-react";
import Link from "next/link";

import { moduleMetadata } from "@/components/module-placeholder";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata = moduleMetadata("cilesimet");

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Cilësimet</h1>
        <StatusBadge tone="warn">Pjesërisht aktiv</StatusBadge>
      </div>
      <p className="text-ink-muted mt-2 max-w-prose">
        Llogaritë personale, të dhënat e kompanisë dhe miratimet.
      </p>

      <Link
        href="/cilesimet/kalimi"
        className="group border-line bg-surface hover:border-brand mt-6 flex min-h-24 items-center gap-4 rounded-lg border p-5"
      >
        <span className="bg-brand-soft text-brand flex size-12 shrink-0 items-center justify-center rounded-md">
          <CalendarCheck aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-lg font-semibold">
            Kalimi nga Excel
            <ArrowRight aria-hidden className="text-ink-muted size-5" />
          </span>
          <span className="text-ink-muted block text-sm">
            Data e fillimit në sistem, dita e fundit në Excel dhe numri i faturës së fundit.
          </span>
        </span>
      </Link>

      <section
        aria-labelledby="cilesimet-bosh"
        className="border-line-strong bg-surface mt-6 rounded-lg border border-dashed px-6 py-10 text-center"
      >
        <CircleSlash aria-hidden className="text-ink-muted mx-auto size-8" />
        <h2 id="cilesimet-bosh" className="mt-3 text-base font-semibold">
          Cilësimet e tjera ende nuk janë aktive
        </h2>
        <p id="cilesimet-ndihme" className="text-ink-muted mx-auto mt-1 max-w-md text-sm">
          Llogaritë, të dhënat e kompanisë dhe miratimet do të aktivizohen pas kontrollit të pavarur
          të cilësisë.
        </p>
        <Button className="mt-5" disabled aria-describedby="cilesimet-ndihme">
          Ndrysho cilësimet
        </Button>
      </section>
    </div>
  );
}
