/**
 * Utilities for children of `<Reveal>`: they start lowered and transparent while the
 * section is still below the fold, then settle into place. Kept outside reveal.tsx so
 * Server Components can import the strings (a "use client" module exports references).
 */
export const revealItem =
  "transition duration-1000 ease-out-soft motion-reduce:transition-none group-data-hidden/reveal:translate-y-8 group-data-hidden/reveal:opacity-0";

/** For a photograph inside `<Reveal>`: settles from a slight zoom. */
export const revealImage =
  "transition duration-1500 ease-out-soft motion-reduce:transition-none group-data-hidden/reveal:scale-110 group-data-hidden/reveal:opacity-0";

/** Stagger steps for sibling items (Tailwind's default delay scale). */
export const revealDelays = [
  "delay-0",
  "delay-150",
  "delay-300",
  "delay-500",
  "delay-700",
] as const;
