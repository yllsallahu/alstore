import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line-strong bg-canvas text-ink-muted",
  warn: "border-warn/30 bg-warn-soft text-warn",
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-brand/25 bg-brand-soft text-brand",
} as const;

export type BadgeTone = keyof typeof tones;

export function StatusBadge({
  tone = "neutral",
  children,
  title,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
