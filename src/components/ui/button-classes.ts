import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary";

const base =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-sm px-6 text-sm font-semibold uppercase tracking-wide font-stretch-semi-expanded transition-colors duration-200 ease-standard";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-hover",
  secondary: "border border-line-strong text-ink hover:border-ink",
};

/**
 * Shared action styling for <button>, <a> and the localized <Link>, so one look
 * covers all three without wrapper components. Min height 48px (touch target).
 */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cx(base, variants[variant], className);
}
