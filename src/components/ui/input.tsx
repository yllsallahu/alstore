import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-line-strong bg-surface text-ink placeholder:text-ink-muted aria-invalid:border-danger h-11 w-full rounded-md border px-3 text-base",
        className,
      )}
      {...props}
    />
  );
}
