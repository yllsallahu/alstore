import { createHash } from "node:crypto";

/** Deterministic JSON: object keys sorted recursively, `undefined` members dropped. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Non-finite numbers cannot be hashed");
    }
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
      throw new TypeError(`Unsupported value type: ${typeof value}`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, member]) => member !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, member]) => `${JSON.stringify(key)}:${canonicalJson(member)}`).join(",")}}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export const requestHash = (payload: unknown) => sha256Hex(canonicalJson(payload));
