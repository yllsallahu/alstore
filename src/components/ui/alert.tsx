import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const tones = {
  info: "border-brand/25 bg-brand-soft text-ink",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/30 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success",
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  role,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  role?: "alert" | "status" | "note";
  className?: string;
}) {
  return (
    <div role={role} className={cn("rounded-md border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}
