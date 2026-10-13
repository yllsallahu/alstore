import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Native select: best keyboard, screen-reader and phone behaviour. */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-line-strong bg-surface text-ink aria-invalid:border-danger h-12 w-full rounded-md border px-3 text-base",
        className,
      )}
      {...props}
    />
  );
}
