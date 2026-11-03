import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "primaryInverse" | "secondaryInverse";
export type ButtonSize = "md" | "sm";

const base =
  "group/button inline-flex items-center justify-center gap-3 rounded-sm text-sm font-medium tracking-wide whitespace-nowrap transition-colors duration-300 ease-standard";

const sizes: Record<ButtonSize, string> = {
  /* Primary actions: 48px touch target. */
  md: "min-h-12 px-7",
  /* Compact actions in the header bar: 44px touch target. */
  sm: "min-h-11 px-5",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-hover",
  secondary: "border border-line-strong text-ink hover:border-ink",
  /* On graphite or a photograph scrim. */
  primaryInverse: "bg-on-graphite text-ink hover:bg-on-graphite-muted",
  secondaryInverse: "border border-on-graphite-muted text-on-graphite hover:border-on-graphite",
};

/**
 * Shared action styling for <button>, <a> and the localized <Link>, so one look
 * covers all three without wrapper components. An arrow icon inside nudges right on hover
 * when it carries `group-hover/button:translate-x-1`.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className?: string,
  size: ButtonSize = "md",
): string {
  return cx(base, sizes[size], variants[variant], className);
}
