import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MODULE_ICONS } from "@/components/app-shell/nav-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { homeActions } from "@/lib/navigation";

export const metadata: Metadata = { title: "Ballina" };

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Ballina</h1>
      <p className="text-ink-muted mt-1">Zgjidhni veprimin që dëshironi të kryeni.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {homeActions().map((m) => {
          const Icon = MODULE_ICONS[m.slug];
          return (
            <li key={m.slug}>
              <Link
                href={m.href}
                className="group border-line bg-surface hover:border-brand relative flex h-full min-h-36 flex-col rounded-lg border p-5 sm:p-6"
              >
                <span className="bg-brand-soft text-brand flex size-12 items-center justify-center rounded-md">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="mt-4 flex items-center gap-2 text-xl font-semibold">
                  {m.label}
                  <ArrowRight
                    aria-hidden
                    className="text-ink-muted size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-ink-muted mt-1 text-sm">{m.description}</span>
                {m.status !== "active" && (
                  <span className="absolute top-5 right-5 sm:top-6 sm:right-6">
                    {m.status === "partial" ? (
                      <StatusBadge tone="warn">Pjesërisht aktiv</StatusBadge>
                    ) : (
                      <StatusBadge>Ende jo aktiv</StatusBadge>
                    )}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
