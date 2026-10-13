import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-line-strong bg-surface text-ink placeholder:text-ink-muted aria-invalid:border-danger min-h-24 w-full rounded-md border px-3 py-2 text-base",
        className,
      )}
      {...props}
    />
  );
}
