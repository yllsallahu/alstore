import { redirect } from "next/navigation";

import type { FormState } from "@/components/forms/form-state";
import { AuthorizationError } from "@/server/auth/permissions";
import {
  UNAVAILABLE_MESSAGES,
  getRequestContext,
  type RequestContext,
} from "@/server/auth/session";
import { DomainError, DuplicateWarning, ValidationError } from "@/server/errors";

export type ReadyContext = Extract<RequestContext, { kind: "ready" }>;

/** What a successful action does next: navigate (fresh page, fresh idempotency key) or stay. */
export type ActionOutcome = { redirectTo: string } | { success: string };

/**
 * Runs a master-data command for a form. Every business error becomes an Albanian message on
 * the form; nothing is reported as saved unless the service committed. Unknown errors rethrow
 * to the error boundary (only a digest is shown).
 */
export async function runFormAction(
  previous: FormState,
  values: Record<string, string>,
  command: (ctx: ReadyContext) => Promise<ActionOutcome>,
): Promise<FormState> {
  const base: FormState = { attempt: previous.attempt + 1, values };
  const ctx = await getRequestContext();
  if (ctx.kind !== "ready") return { ...base, formError: UNAVAILABLE_MESSAGES[ctx.reason] };

  let outcome: ActionOutcome;
  try {
    outcome = await command(ctx);
  } catch (error) {
    if (error instanceof DuplicateWarning) return { ...base, duplicates: error.matches };
    if (error instanceof ValidationError) {
      return { ...base, formError: error.message, fieldErrors: error.fieldErrors };
    }
    if (error instanceof AuthorizationError || error instanceof DomainError) {
      return { ...base, formError: error.message };
    }
    throw error;
  }
  if ("redirectTo" in outcome) redirect(outcome.redirectTo);
  return { attempt: base.attempt, success: outcome.success };
}

export const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export const checked = (form: FormData, name: string) => form.get(name) === "on";

export const all = (form: FormData, name: string) =>
  form.getAll(name).filter((value): value is string => typeof value === "string");

/** Echoes plain text fields back to the form after an error (never files or secrets). */
export function echo(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string" && name !== "acknowledgedDuplicateIds" && !name.startsWith("$")) {
      out[name] = value;
    }
  }
  return out;
}
