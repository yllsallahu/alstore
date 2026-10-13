/**
 * Fixed-point decimal strings for quantities and unit prices (3 dp) and EUR amounts (2 dp).
 * No JavaScript `number` ever carries a business value: parsing and formatting are string-based.
 */

export type DecimalError = "EMPTY" | "FORMAT" | "SEPARATORS" | "SCALE" | "NEGATIVE" | "TOO_LARGE";

export type DecimalResult = { ok: true; value: string } | { ok: false; error: DecimalError };

export interface DecimalOptions {
  /** Maximum digits after the decimal separator (3 for quantities/prices, 2 for EUR). */
  scale: 2 | 3;
  /** Maximum digits before the separator; numeric(18,3) allows 15. */
  maxIntegerDigits?: number;
}

/**
 * Accepts "12", "12,5", "12.5", "0,125". Exactly one decimal separator (comma or point) and no
 * thousands separators, so "1.234" is never silently read as one thousand. Returns the canonical
 * form with exactly `scale` decimals and a point separator ("12.500"), as PostgreSQL stores it.
 */
export function parseDecimal(input: string, options: DecimalOptions): DecimalResult {
  const maxInt = options.maxIntegerDigits ?? 18 - options.scale;
  const raw = input.trim();
  if (raw === "") return { ok: false, error: "EMPTY" };
  if (raw.startsWith("-")) return { ok: false, error: "NEGATIVE" };
  const separators = raw.match(/[.,]/g) ?? [];
  if (separators.length > 1) return { ok: false, error: "SEPARATORS" };
  const match = /^(\d+)(?:[.,](\d*))?$/.exec(raw);
  if (!match) return { ok: false, error: "FORMAT" };
  const integerPart = match[1]!.replace(/^0+(?=\d)/, "");
  const fraction = match[2] ?? "";
  if (fraction.length > options.scale) return { ok: false, error: "SCALE" };
  if (integerPart.length > maxInt) return { ok: false, error: "TOO_LARGE" };
  return { ok: true, value: `${integerPart}.${fraction.padEnd(options.scale, "0")}` };
}

export const DECIMAL_MESSAGES: Record<DecimalError, (scale: number) => string> = {
  EMPTY: () => "Shkruani një vlerë.",
  FORMAT: () => "Shkruani vetëm shifra, p.sh. 12,5.",
  SEPARATORS: () => "Përdorni vetëm një presje dhjetore dhe asnjë ndarës për mijëshet.",
  SCALE: (scale) => `Lejohen deri në ${scale} shifra pas presjes.`,
  NEGATIVE: () => "Vlera nuk mund të jetë negative.",
  TOO_LARGE: () => "Vlera është shumë e madhe.",
};

const grouping = new Intl.NumberFormat("sq-XK", { useGrouping: true });

/** Albanian display of a canonical decimal string: "1234.500" → "1 234,500". */
export function formatDecimal(value: string | null | undefined, scale: 2 | 3): string {
  if (value === null || value === undefined || value === "") return "—";
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value;
  const [, sign, integerPart, fraction = ""] = match;
  const grouped = grouping.format(BigInt(integerPart!));
  return `${sign}${grouped},${fraction.padEnd(scale, "0").slice(0, scale)}`;
}

/** Albanian input form of a canonical decimal: "12.500" → "12,5" (trailing zeros dropped). */
export function decimalToInput(value: string | null | undefined): string {
  if (!value) return "";
  const [integerPart, fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${integerPart},${trimmed}` : (integerPart ?? "");
}
