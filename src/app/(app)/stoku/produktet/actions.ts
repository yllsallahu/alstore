"use server";

import type { FormState } from "@/components/forms/form-state";
import { all, checked, echo, runFormAction, text } from "@/server/actions/form-action";
import {
  createProduct,
  decideUnitChange,
  requestUnitChange,
  updateProduct,
} from "@/server/services/master-data/products";

const productFields = (form: FormData) => ({
  name: text(form, "name"),
  category: text(form, "category") as never,
  unit: text(form, "unit") as never,
  barcode: text(form, "barcode"),
  referencePurchasePrice: text(form, "referencePurchasePrice"),
  active: checked(form, "active"),
  acknowledgedDuplicateIds: all(form, "acknowledgedDuplicateIds"),
});

export async function createProductAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const { productId } = await createProduct(
      db,
      actor,
      { sku: text(form, "sku"), ...productFields(form) },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/produktet/${productId}?ruajtur=krijuar` };
  });
}

export async function updateProductAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const productId = text(form, "productId");
    await updateProduct(
      db,
      actor,
      { productId, expectedVersion: Number(text(form, "expectedVersion")), ...productFields(form) },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/produktet/${productId}?ruajtur=ndryshuar` };
  });
}

export async function requestUnitChangeAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const productId = text(form, "productId");
    await requestUnitChange(
      db,
      actor,
      { productId, toUnit: text(form, "toUnit") as never, reason: text(form, "reason") },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/produktet/${productId}?ruajtur=kerkese` };
  });
}

export async function decideUnitChangeAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const productId = text(form, "productId");
    const decision = text(form, "decision") as "APPROVE" | "REJECT" | "CANCEL";
    await decideUnitChange(
      db,
      actor,
      { changeId: text(form, "changeId"), decision, comment: text(form, "comment") },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/produktet/${productId}?ruajtur=vendim-${decision.toLowerCase()}` };
  });
}
