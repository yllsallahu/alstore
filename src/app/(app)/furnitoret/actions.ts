"use server";

import type { FormState } from "@/components/forms/form-state";
import { SUPPLIER_IDENTIFIER_TYPES } from "@/server/db/schema/enums";
import { all, checked, echo, runFormAction, text } from "@/server/actions/form-action";
import { createSupplier, updateSupplier } from "@/server/services/master-data/suppliers";

const supplierFields = (form: FormData) => {
  const country = text(form, "country");
  const types: readonly string[] =
    country === "XK" || country === "AL" ? SUPPLIER_IDENTIFIER_TYPES[country] : [];
  return {
    legalName: text(form, "legalName"),
    country: country as never,
    identifiers: Object.fromEntries(types.map((type) => [type, text(form, `identifiers.${type}`)])),
    address: text(form, "address"),
    city: text(form, "city"),
    invoiceReferenceNote: text(form, "invoiceReferenceNote"),
    active: checked(form, "active"),
    acknowledgedDuplicateIds: all(form, "acknowledgedDuplicateIds"),
  };
};

export async function createSupplierAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const { supplierId } = await createSupplier(
      db,
      actor,
      supplierFields(form),
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/furnitoret/${supplierId}?ruajtur=krijuar` };
  });
}

export async function updateSupplierAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const supplierId = text(form, "supplierId");
    await updateSupplier(
      db,
      actor,
      {
        supplierId,
        expectedVersion: Number(text(form, "expectedVersion")),
        ...supplierFields(form),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/furnitoret/${supplierId}?ruajtur=ndryshuar` };
  });
}
