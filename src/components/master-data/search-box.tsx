"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Search as you type (debounced URL update, server-rendered results); also works as a plain GET
 * form without JavaScript.
 */
export function SearchBox({
  label,
  placeholder,
  inactiveLabel,
}: {
  label: string;
  placeholder: string;
  inactiveLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inactive = params.get("joaktive") === "on";

  useEffect(() => () => clearTimeout(timer.current), []);

  const push = (next: string, withInactive: boolean) => {
    const search = new URLSearchParams();
    if (next.trim()) search.set("q", next.trim());
    if (withInactive) search.set("joaktive", "on");
    const query = search.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  return (
    <form role="search" action={pathname} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="kerko" className="text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="text-ink-muted pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          />
          <Input
            id="kerko"
            type="search"
            name="q"
            value={q}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={80}
            className="h-12 pl-10"
            onChange={(event) => {
              const next = event.target.value;
              setQ(next);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => push(next, inactive), 250);
            }}
          />
        </div>
      </div>
      <label className="flex min-h-12 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="joaktive"
          defaultChecked={inactive}
          className="accent-brand size-5"
          onChange={(event) => push(q, event.target.checked)}
        />
        {inactiveLabel}
      </label>
      <Button type="submit" size="lg" variant="secondary">
        Kërko
      </Button>
      <span aria-live="polite" className="sr-only">
        {pending ? "Duke kërkuar…" : ""}
      </span>
    </form>
  );
}
