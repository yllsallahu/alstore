"use server";

import type { FormState } from "@/components/forms/form-state";
import { IMPORT_LIMITS } from "@/lib/import/errors";
import { checked, echo, runFormAction, text } from "@/server/actions/form-action";
import { DomainError } from "@/server/errors";
import {
  approveImport,
  rejectImport,
  remapImport,
  uploadImport,
} from "@/server/services/imports/import-batches";

/** Reads the uploaded file; an empty or oversized upload becomes an Albanian error. */
async function readFile(form: FormData): Promise<{ name: string; bytes: Uint8Array }> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new DomainError("IMPORT_NO_FILE", "Zgjidhni një skedar CSV ose XLSX.", 422);
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new DomainError(
      "IMPORT_TOO_LARGE",
      `Skedari është shumë i madh (maksimumi ${IMPORT_LIMITS.maxFileBytes / (1024 * 1024)} MB).`,
      422,
    );
  }
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function uploadProductImportAction(
  prev: FormState,
  form: FormData,
): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const file = await readFile(form);
    const { batchId } = await uploadImport(
      db,
      actor,
      { kind: "PRODUCTS", fileName: file.name, bytes: file.bytes },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/importi/${batchId}?ruajtur=ngarkuar` };
  });
}

export async function remapImportAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    const mapping: Record<string, number> = {};
    for (const [name, value] of form.entries()) {
      if (!name.startsWith("map.") || typeof value !== "string") continue;
      if (value !== "") mapping[name.slice(4)] = Number(value);
    }
    await remapImport(db, actor, { batchId, mapping }, text(form, "idempotencyKey"));
    return { redirectTo: `/stoku/importi/${batchId}?ruajtur=kolonat` };
  });
}

export async function approveImportAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    const excluded = text(form, "acknowledgedErrorRows");
    const result = await approveImport(
      db,
      actor,
      {
        batchId,
        mode: text(form, "mode") as never,
        acknowledgeWarnings: checked(form, "acknowledgeWarnings"),
        acknowledgedErrorRows: excluded === "" ? null : Number(excluded),
        expectedPreviewHash: text(form, "expectedPreviewHash"),
        note: text(form, "note"),
      },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/importi/${batchId}?ruajtur=miratuar-${result.approvedRows}` };
  });
}

export async function rejectImportAction(prev: FormState, form: FormData): Promise<FormState> {
  return runFormAction(prev, echo(form), async ({ db, actor }) => {
    const batchId = text(form, "batchId");
    await rejectImport(
      db,
      actor,
      { batchId, note: text(form, "note") },
      text(form, "idempotencyKey"),
    );
    return { redirectTo: `/stoku/importi/${batchId}?ruajtur=refuzuar` };
  });
}
