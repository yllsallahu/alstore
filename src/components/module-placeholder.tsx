import { CircleSlash } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getModule, type ModuleSlug } from "@/lib/navigation";

export function moduleMetadata(slug: ModuleSlug): Metadata {
  return { title: getModule(slug).label };
}

export function ModulePlaceholder({ slug }: { slug: ModuleSlug }) {
  const appModule = getModule(slug);
  const hintId = `${slug}-gjendja`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{appModule.label}</h1>
        <StatusBadge>Ende jo aktiv</StatusBadge>
      </div>
      <p className="text-ink-muted mt-2 max-w-prose">{appModule.description}</p>

      {appModule.notice && (
        <p
          role="status"
          className="border-warn/30 bg-warn-soft text-warn mt-4 rounded-md border px-4 py-3 text-sm font-medium"
        >
          {appModule.notice}
        </p>
      )}

      <section
        aria-labelledby={`${slug}-bosh`}
        className="border-line-strong bg-surface mt-6 rounded-lg border border-dashed px-6 py-10 text-center"
      >
        <CircleSlash aria-hidden className="text-ink-muted mx-auto size-8" />
        <h2 id={`${slug}-bosh`} className="mt-3 text-base font-semibold">
          Ky modul ende nuk është aktiv
        </h2>
        <p id={hintId} className="text-ink-muted mx-auto mt-1 max-w-md text-sm">
          Do të aktivizohet në fazën {appModule.plannedPhase}, pas kontrollit të pavarur të
          cilësisë. Deri atëherë nuk mund të regjistrohet asnjë e dhënë.
        </p>
        <Button className="mt-5" disabled aria-describedby={hintId}>
          {appModule.primaryAction}
        </Button>
      </section>
    </div>
  );
}
