import type { Tx } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";
import type { Actor } from "@/server/auth/permissions";

type SafeValue = string | number | boolean | null | SafeValue[] | { [key: string]: SafeValue };

const SENSITIVE_KEY =
  /pass(word)?|secret|token|cookie|session|authorization|api[-_]?key|iban|e-?mail|phone|bearer/i;
const MAX_STRING = 200;
const MAX_ARRAY = 20;
const MAX_DEPTH = 3;

/**
 * `safe_details` never carries credentials, contact data or free-form payloads: sensitive keys
 * are dropped, strings truncated, depth and array length bounded.
 */
export function sanitizeDetails(value: unknown, depth = 0): SafeValue | undefined {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
      return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    case "number":
      return Number.isFinite(value) ? value : undefined;
    case "boolean":
      return value;
    case "object": {
      if (depth >= MAX_DEPTH) return undefined;
      if (Array.isArray(value)) {
        return value
          .slice(0, MAX_ARRAY)
          .map((item) => sanitizeDetails(item, depth + 1))
          .filter((item): item is SafeValue => item !== undefined);
      }
      const out: Record<string, SafeValue> = {};
      for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEY.test(key)) continue;
        const safe = sanitizeDetails(member, depth + 1);
        if (safe !== undefined) out[key] = safe;
      }
      return out;
    }
    default:
      return undefined;
  }
}

export interface AuditInput {
  orgId: string;
  /** `null` only for documented system operations (organization bootstrap). */
  actor: Pick<Actor, "userId" | "role"> | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  idempotencyKey?: string | null;
  beforeHash?: string | null;
  afterHash?: string | null;
  details?: Record<string, unknown>;
}

/** Appends one audit event inside the caller's business transaction. */
export async function writeAudit(tx: Tx, input: AuditInput): Promise<void> {
  const safeDetails = sanitizeDetails(input.details ?? {}) ?? {};
  await tx.insert(auditEvents).values({
    orgId: input.orgId,
    actorId: input.actor?.userId ?? null,
    actorRole: input.actor?.role ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    requestId: input.requestId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    beforeHash: input.beforeHash ?? null,
    afterHash: input.afterHash ?? null,
    safeDetails,
  });
}
