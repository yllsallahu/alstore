import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type EyebrowProps = {
  children: ReactNode;
  /** Element to render; use "h2" when the label titles a region (e.g. footer columns). */
  as?: "p" | "h2";
  /** Background the label sits on. */
  tone?: "paper" | "graphite";
  className?: string;
};

/** Small uppercase label preceded by a bronze rule. The site's recurring section marker. */
export function Eyebrow({ children, as: Tag = "p", tone = "paper", className }: EyebrowProps) {
  return (
    <Tag
      className={cx(
        "flex items-center gap-3 text-xs font-semibold uppercase tracking-label",
        tone === "paper" ? "text-ink-muted" : "text-on-graphite-muted",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
      <span>{children}</span>
    </Tag>
  );
}
