"use client";

// Client Component because visitors switch filters without a page load. It receives
// pre-translated labels and server-rendered cards as props, so it needs no message namespace.

import { type ReactNode, useState } from "react";
import { cx } from "@/lib/cx";
import { projectGridClasses } from "./project-grid";

type FilterGroup = {
  id: "system" | "type";
  label: string;
  options: { value: string; label: string }[];
};

type FilterableItem = {
  slug: string;
  systems: string[];
  type: string;
  card: ReactNode;
};

type ProjectFiltersProps = {
  groups: FilterGroup[];
  items: FilterableItem[];
  labels: { filters: string; all: string; list: string; empty: string };
};

type Selection = Record<FilterGroup["id"], string | null>;

export function ProjectFilters({ groups, items, labels }: ProjectFiltersProps) {
  const [selection, setSelection] = useState<Selection>({ system: null, type: null });

  const visible = items.filter(
    ({ systems, type }) =>
      (!selection.system || systems.includes(selection.system)) &&
      (!selection.type || type === selection.type),
  );

  return (
    <div className="mt-12 lg:mt-16">
      <div role="group" aria-label={labels.filters} className="grid gap-6 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} role="group" aria-label={group.label}>
            <p className="text-xs font-semibold uppercase tracking-label text-ink-muted">
              {group.label}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6">
              {[{ value: null, label: labels.all }, ...group.options].map((option) => {
                const active = selection[group.id] === option.value;
                return (
                  <li key={option.value ?? "all"}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelection((s) => ({ ...s, [group.id]: option.value }))}
                      className={cx(
                        "min-h-11 border-b-2 text-sm font-semibold transition-colors duration-200 ease-standard",
                        active
                          ? "border-accent text-ink"
                          : "border-transparent text-ink-muted hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {visible.length > 0 ? (
        <ul aria-label={labels.list} className={cx("mt-8", projectGridClasses)}>
          {visible.map(({ slug, card }) => (
            <li key={slug} className="border-r border-b border-line">
              {card}
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="mt-8 border-t border-line pt-8 text-ink-muted">
          {labels.empty}
        </p>
      )}
    </div>
  );
}
