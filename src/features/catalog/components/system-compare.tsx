"use client";
// Client Component: holds the two selected systems and the "differences only" switch, and
// keeps them in the URL so a comparison can be shared. All text arrives resolved as props,
// so it needs no message namespace.

import { useEffect, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import type { SpecCell } from "../spec-copy";

export type CompareSystem = {
  key: string;
  name: string;
  category: string;
  /** Series slug when the system has its own page. */
  slug: string | null;
};

export type CompareRow = { row: string; label: string; cells: Record<string, SpecCell> };

type SystemCompareProps = {
  systems: CompareSystem[];
  rows: CompareRow[];
  labels: {
    first: string;
    second: string;
    onlyDifferences: string;
    caption: string;
    specHeader: string;
    differs: string;
    viewPage: string;
    noPage: string;
    sameSelection: string;
    noDifferences: string;
    notDocumented: string;
    sourceLabel: string;
  };
};

/** Both values documented and different. A missing value is not a documented difference. */
function differs(a: SpecCell, b: SpecCell) {
  return a !== null && b !== null && a.text !== b.text;
}

export function SystemCompare({ systems, rows, labels }: SystemCompareProps) {
  const id = useId();
  const [first, setFirst] = useState(systems[0]?.key ?? "");
  const [second, setSecond] = useState(systems[1]?.key ?? "");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  // The URL is written only after it has been read, so a shared link is never overwritten.
  const [restored, setRestored] = useState(false);

  // Restore a shared comparison (?first=s70000&second=s71000) after hydration.
  // Later changes are written to the URL by the effect below, never read back from it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const known = (value: string | null): value is string =>
      systems.some((system) => system.key === value);
    const firstFromUrl = params.get("first");
    const secondFromUrl = params.get("second");

    if (known(firstFromUrl)) {
      setFirst(firstFromUrl);
      // Keep the pair distinct when only the first system is given (links from system pages).
      setSecond((current) =>
        current === firstFromUrl
          ? (systems.find((system) => system.key !== firstFromUrl)?.key ?? current)
          : current,
      );
    }
    if (known(secondFromUrl) && secondFromUrl !== firstFromUrl) setSecond(secondFromUrl);
    setRestored(true);
  }, [systems]);

  useEffect(() => {
    if (!restored) return;
    const url = new URL(window.location.href);
    url.searchParams.set("first", first);
    url.searchParams.set("second", second);
    window.history.replaceState(null, "", url);
  }, [first, second, restored]);

  const a = systems.find((system) => system.key === first);
  const b = systems.find((system) => system.key === second);
  const visibleRows =
    a && b && onlyDifferences
      ? rows.filter((row) => differs(row.cells[a.key] ?? null, row.cells[b.key] ?? null))
      : rows;

  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    suffix: string,
  ) => (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`${id}-${suffix}`}
        className="text-xs font-semibold tracking-label text-ink-muted uppercase"
      >
        {label}
      </label>
      <select
        id={`${id}-${suffix}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-sm border border-line-strong bg-paper px-4 font-semibold tabular-nums"
      >
        {systems.map((system) => (
          <option key={system.key} value={system.key}>
            {system.name} · {system.category}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <div className="grid gap-6 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
        {select(labels.first, first, setFirst, "first")}
        {select(labels.second, second, setSecond, "second")}
        <label className="flex min-h-12 items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlyDifferences}
            onChange={(event) => setOnlyDifferences(event.target.checked)}
            className="size-5 accent-ink"
          />
          {labels.onlyDifferences}
        </label>
      </div>

      <div aria-live="polite" className="mt-10">
        {!a || !b || a.key === b.key ? (
          <p className="border border-line bg-paper-sunken px-4 py-3 text-sm">
            {labels.sameSelection}
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse text-left text-sm sm:text-base">
            <caption className="sr-only">
              {labels.caption.replace("{first}", a.name).replace("{second}", b.name)}
            </caption>
            <thead>
              <tr className="border-b border-line-strong align-bottom">
                <th
                  scope="col"
                  className="w-1/4 pb-4 pr-3 text-xs font-semibold tracking-label text-ink-muted uppercase sm:w-1/3"
                >
                  {labels.specHeader}
                </th>
                {[a, b].map((system) => (
                  <th key={system.key} scope="col" className="pb-4 pr-3 font-normal">
                    <span className="block text-xs font-semibold tracking-label text-accent-ink uppercase">
                      {system.category}
                    </span>
                    <span className="mt-1 block text-xl font-semibold text-brand tabular-nums font-stretch-semi-expanded">
                      {system.name}
                    </span>
                    {system.slug ? (
                      <Link
                        href={{ pathname: "/systems/[slug]", params: { slug: system.slug } }}
                        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                      >
                        {labels.viewPage}
                        <span className="sr-only">: {system.name}</span>
                      </Link>
                    ) : (
                      <span className="mt-1 block min-h-11 py-3 text-sm text-ink-muted">
                        {labels.noPage}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, label, cells }) => {
                const left = cells[a.key] ?? null;
                const right = cells[b.key] ?? null;
                const isDifferent = differs(left, right);
                return (
                  <tr
                    key={row}
                    className={cx(
                      "border-b border-line align-top",
                      isDifferent && "bg-paper-sunken",
                    )}
                  >
                    <th scope="row" className="py-4 pr-3 pl-2 text-sm font-semibold text-ink-muted">
                      {label}
                      {isDifferent ? (
                        <span className="mt-2 block w-fit border border-accent-ink px-2 py-0.5 text-accent-ink">
                          {labels.differs}
                        </span>
                      ) : null}
                    </th>
                    {[left, right].map((cell, index) => (
                      <td
                        key={index === 0 ? a.key : b.key}
                        className="py-4 pr-3 text-pretty tabular-nums"
                      >
                        {cell ? (
                          <>
                            {cell.text}
                            <span className="mt-1 block text-xs text-ink-muted">
                              {labels.sourceLabel}:{" "}
                              {cell.documentId ? (
                                <Link
                                  href={{ pathname: "/documents", hash: cell.documentId }}
                                  className="underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                                >
                                  {cell.shortSource}
                                </Link>
                              ) : (
                                cell.shortSource
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-muted">{labels.notDocumented}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-ink-muted">
                    {labels.noDifferences}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
