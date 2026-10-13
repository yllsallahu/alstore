import { sql, type SQL } from "drizzle-orm";
import type { z } from "zod";

import { fieldErrorsOf } from "@/lib/validation/master-data";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { sqlState } from "@/server/db/client";
import { canonicalJson } from "@/server/lib/canonical-hash";
import { DuplicateWarning, ValidationError, type DuplicateMatch } from "@/server/errors";

/** Parses with the shared schema; failures become Albanian field errors. */
export function parseOrThrow<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new ValidationError(fieldErrorsOf(result.error));
  return result.data;
}

/** Comparable form of a name: lower case, ë/ç folded, punctuation and legal-form suffixes dropped. */
export function normalizeName(value: string): string {
  const folded = value
    .toLowerCase()
    .replace(/[ë]/g, "e")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return folded.replace(/(\s(sh ?p ?k|sh ?a|l ?l ?c|n ?sh|b ?i))+$/, "").trim();
}

/** Same normalization in SQL for the duplicate and search queries. */
export const normalizedSql = (column: AnyPgColumn | SQL): SQL =>
  sql`btrim(regexp_replace(btrim(regexp_replace(regexp_replace(translate(lower(${column}), 'ëçËÇ', 'ecec'), '[^a-z0-9 ]+', ' ', 'g'), '\\s+', ' ', 'g')), '(\\s(sh ?p ?k|sh ?a|l ?l ?c|n ?sh|b ?i))+$', ''))`;

/** Escapes LIKE wildcards in user input (default escape character is backslash). */
export const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Throws DuplicateWarning unless every current match was acknowledged by the user. */
export function assertDuplicatesAcknowledged(matches: DuplicateMatch[], acknowledged: string[]) {
  const unacknowledged = matches.filter((match) => !acknowledged.includes(match.id));
  if (unacknowledged.length > 0) throw new DuplicateWarning(matches);
}

/** Merges matches for the same record into one entry with all reasons. */
export function mergeMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  const byId = new Map<string, DuplicateMatch>();
  for (const match of matches) {
    const existing = byId.get(match.id);
    if (!existing) byId.set(match.id, { ...match });
    else if (!existing.reason.includes(match.reason)) existing.reason += `; ${match.reason}`;
  }
  return [...byId.values()];
}

export const isUniqueViolation = (error: unknown, constraint?: string) => {
  if (sqlState(error) !== "23505") return false;
  if (!constraint) return true;
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      typeof current === "object" &&
      "constraint_name" in current &&
      (current as { constraint_name?: string }).constraint_name === constraint
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

/** Field names whose values differ between two plain records. */
export function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): string[] {
  return Object.keys(after).filter(
    (key) => canonicalJson(before[key] ?? null) !== canonicalJson(after[key] ?? null),
  );
}
