"use server";

import type { FormState } from "@/components/forms/form-state";
import { KOSOVO_IDENTIFIER_TYPES } from "@/server/db/schema/enums";
import { all, checked, echo, runFormAction, text } from "@/server/actions/form-action";
import {
  createCustomer,
  reinstateCustomer,
  suspendCustomer,
  updateCustomer,
} from "@/server/services/master-data/customers";
import { retireFormatRule, setFormatRule } from "@/server/services/master-data/identifier-rules";

const customerFields = (form: FormData) => ({
  legalName: text(form, "legalName"),
  identifiers: Object.fromEntries(
    KOSOVO_IDENTIFIER_TYPES.map((type) => [type, text(form, `identifiers.${type}`)]),
  ) as Record<(typeof KOSOVO_IDENTIFIER_TYPES)[number], string>,
  address: text(form, "address"),
  city: text(form, "city"),
  active: checked(form, "active"),
  acknowledgedDuplicateIds: all(form, "acknowledgedDuplicateIds"),
});

export async function createCustomerAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const { customerId } = await createCustomer(
      db,
      actor,
      customerFields(form),
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/klientet/${customerId}?ruajtur=krijuar` };
  });
}

export async function updateCustomerAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const customerId = text(form, "customerId");
    await updateCustomer(
      db,
      actor,
      {
        customerId,
        expectedVersion: Number(text(form, "expectedVersion")),
        ...customerFields(form),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/klientet/${customerId}?ruajtur=ndryshuar` };
  });
}

export async function suspendCustomerAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const customerId = text(form, "customerId");
    const input = { customerId, reason: text(form, "reason") };
    const key = text(form, "idempotencyKey");
    if (text(form, "mode") === "reinstate") {
      await reinstateCustomer(db, actor, input, key);
      return { redirectTo: `/klientet/${customerId}?ruajtur=rikthyer` };
    }
    await suspendCustomer(db, actor, input, key);
    return { redirectTo: `/klientet/${customerId}?ruajtur=pezulluar` };
  });
}

export async function setFormatRuleAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    await setFormatRule(
      db,
      actor,
      {
        identifierType: text(form, "identifierType") as never,
        required: checked(form, "required"),
        digitsOnly: checked(form, "digitsOnly"),
        minLength: text(form, "minLength") as never,
        maxLength: text(form, "maxLength") as never,
        sourceNote: text(form, "sourceNote"),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: "/klientet/rregullat?ruajtur=rregull" };
  });
}

export async function retireFormatRuleAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    await retireFormatRule(db, actor, text(form, "ruleId"), text(form, "idempotencyKey"));
    return { redirectTo: "/klientet/rregullat?ruajtur=rregull-hequr" };
  });
}
