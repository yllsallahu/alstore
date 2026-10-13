"use server";

import type { FormState } from "@/components/forms/form-state";
import { IMPORT_LIMITS } from "@/lib/import/errors";
import { echo, runFormAction, text } from "@/server/actions/form-action";
import { DomainError, ValidationError } from "@/server/errors";
import { uploadImport } from "@/server/services/imports/import-batches";
import {
  createOpeningBatch,
  findProductForCount,
  markCounted,
  reconcileOpeningBatch,
  removeOpeningLine,
  reopenOpeningBatch,
  saveOpeningLine,
  signOffAndPostOpeningBatch,
} from "@/server/services/opening/opening-stock";

const base = "/stoku/gjendja-fillestare";

export async function createOpeningBatchAction(
  prev: FormState,
  form: FormData,
): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const { batchId } = await createOpeningBatch(db, actor, text(form, "idempotencyKey"));
    return { redirectTo: `${base}/${batchId}?ruajtur=krijuar` };
  });
}

export async function saveOpeningLineAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    const product = await findProductForCount(db, actor, text(form, "sku"));
    if (!product) {
      throw new ValidationError({
        sku: "Nuk ekziston produkt me këtë SKU. Produktet krijohen te Produktet ose me import produktesh.",
      });
    }
    await saveOpeningLine(
      db,
      actor,
      {
        batchId,
        productId: product.id,
        status: text(form, "status") as never,
        quantity: text(form, "quantity"),
        evidence: text(form, "evidence"),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `${base}/${batchId}?ruajtur=rreshti` };
  });
}

export async function removeOpeningLineAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await removeOpeningLine(
      db,
      actor,
      { batchId, productId: text(form, "productId") },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `${base}/${batchId}?ruajtur=hequr` };
  });
}

export async function markCountedAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await markCounted(db, actor, { batchId }, text(form, "idempotencyKey"));
    return { redirectTo: `${base}/${batchId}?ruajtur=numeruar` };
  });
}

export async function reopenOpeningAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await reopenOpeningBatch(db, actor, { batchId }, text(form, "idempotencyKey"));
    return { redirectTo: `${base}/${batchId}?ruajtur=rihapur` };
  });
}

export async function reconcileOpeningAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await reconcileOpeningBatch(
      db,
      actor,
      { batchId, note: text(form, "note") },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `${base}/${batchId}?ruajtur=rakorduar` };
  });
}

export async function signOffOpeningAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await signOffAndPostOpeningBatch(
      db,
      actor,
      {
        batchId,
        expectedLinesHash: text(form, "expectedLinesHash"),
        acknowledgedUnknownCount: text(form, "acknowledgedUnknownCount"),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `${base}/${batchId}?ruajtur=regjistruar` };
  });
}

export async function uploadCountSheetAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new DomainError("IMPORT_NO_FILE", "Zgjidhni një skedar CSV ose XLSX.", 422);
    }
    if (file.size > IMPORT_LIMITS.maxFileBytes) {
      throw new DomainError(
        "IMPORT_TOO_LARGE",
        "Skedari është shumë i madh (maksimumi 2 MB).",
        422,
      );
    }
    const { batchId } = await uploadImport(
      db,
      actor,
      {
        kind: "OPENING_STOCK",
        fileName: file.name,
        targetOpeningBatchId: text(form, "targetOpeningBatchId"),
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/importi/${batchId}?ruajtur=ngarkuar` };
  });
}
