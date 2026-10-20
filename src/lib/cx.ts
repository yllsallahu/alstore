/** Joins class names, dropping falsy values. Intentionally tiny: no class merging. */
export function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
