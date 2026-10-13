import { createHash } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { IMPORT_LIMITS, ImportFileError } from "@/lib/import/errors";
import {
  cleanMapping,
  fieldsFor,
  suggestMapping,
  validateMapping,
  type ColumnMapping,
  type ImportKind,
} from "@/lib/import/fields";
import {
  applyProductDuplicateChecks,
  error as rowError,
  parseOpeningRow,
  parseProductRow,
  resolveOpeningRows,
  statusOf,
  type ParsedOpeningRow,
  type ParsedProductRow,
  type RowIssue,
  type StagedOpeningRow,
  type StagedProductRow,
} from "@/lib/import/rows";
import {
  importApproveSchema,
  importRejectSchema,
  importRemapSchema,
  importUploadSchema,
} from "@/lib/validation/imports";
import { assertActorActive } from "@/server/auth/actor";
import { authorize, type Actor, type Permission } from "@/server/auth/permissions";
import { sanitizeDetails, writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import {
  auditEvents,
  importBatchRows,
  importBatches,
  openingStockBatches,
  openingStockLines,
  products,
} from "@/server/db/schema";
import { DomainError, ValidationError, notFound } from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { canonicalJson, requestHash, sha256Hex } from "@/server/lib/canonical-hash";
import { parseImportFile } from "@/server/import/parse-file";

import { isUniqueViolation, parseOrThrow } from "../master-data/common";
import { productHash } from "../master-data/products";

type Replayable<T> = T & { replayed: boolean };

const ENTITY = "import_batch";
const DECIDED = ["APPROVED", "REJECTED"] as const;

export type ImportBatchRow = typeof importBatches.$inferSelect;

export const uploadPermission = (kind: ImportKind): Permission =>
  kind === "PRODUCTS" ? "P-20" : "P-22";
export const decidePermission = (kind: ImportKind): Permission =>
  kind === "PRODUCTS" ? "P-21" : "P-22";

const isImportKind = (value: string): value is ImportKind =>
  value === "PRODUCTS" || value === "OPENING_STOCK";

const importChanged = () =>
  new DomainError(
    "IMPORT_CHANGED",
    "Të dhënat ekzistuese ndryshuan pasi e shikuat parashikimin. Parashikimi u rifreskua: kontrolloni rreshtat dhe miratoni përsëri.",
    409,
  );

const fileError = (cause: ImportFileError) =>
  new DomainError(`IMPORT_${cause.code}`, cause.message, 422);

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

interface PreviewSummary {
  rowCount: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  previewHash: string;
}

/**
 * Re-runs the whole dry run against the CURRENT database state and stores the result on the rows
 * and the batch. Called after an upload, after a mapping change and again at approval, so the
 * approver can only ever approve what the database says right now.
 */
async function revalidateBatch(
  tx: Tx,
  orgId: string,
  batch: ImportBatchRow,
  mapping: ColumnMapping,
): Promise<PreviewSummary> {
  const kind = batch.kind as ImportKind;
  const headers = batch.headers as string[];
  const rows = await tx
    .select()
    .from(importBatchRows)
    .where(eq(importBatchRows.batchId, batch.id))
    .orderBy(importBatchRows.rowNo);

  const withExtraCells = (raw: string[], issues: RowIssue[]) => {
    if (raw.slice(headers.length).some((cell) => cell.trim() !== "")) {
      issues.push(
        rowError(
          null,
          "EXTRA_CELLS",
          "Rreshti ka qeliza në kolona pa titull. Kontrolloni skedarin.",
        ),
      );
    }
  };

  const results: {
    id: string;
    rowNo: number;
    status: string;
    issues: RowIssue[];
    parsed: ParsedProductRow | ParsedOpeningRow | null;
    productId: string | null;
  }[] = [];

  if (kind === "PRODUCTS") {
    const staged: (StagedProductRow & { id: string })[] = rows.map((row) => {
      const { parsed, issues } = parseProductRow(row.raw as string[], mapping);
      withExtraCells(row.raw as string[], issues);
      return { id: row.id, rowNo: row.rowNo, parsed, issues };
    });
    const existing = await tx
      .select({ sku: products.sku, barcode: products.barcode, name: products.name })
      .from(products);
    applyProductDuplicateChecks(staged, existing);
    for (const row of staged) {
      results.push({
        id: row.id,
        rowNo: row.rowNo,
        status: statusOf(row.issues),
        issues: row.issues,
        parsed: row.parsed,
        productId: null,
      });
    }
  } else {
    const staged: (StagedOpeningRow & { id: string })[] = rows.map((row) => {
      const { parsed, issues } = parseOpeningRow(row.raw as string[], mapping);
      withExtraCells(row.raw as string[], issues);
      return { id: row.id, rowNo: row.rowNo, parsed, issues, productId: null };
    });
    const skus = [...new Set(staged.flatMap((row) => (row.parsed ? [row.parsed.sku] : [])))];
    const found =
      skus.length === 0
        ? []
        : await tx
            .select({
              id: products.id,
              sku: products.sku,
              unit: products.unit,
              active: products.active,
            })
            .from(products)
            .where(inArray(products.sku, skus));
    resolveOpeningRows(staged, new Map(found.map((product) => [product.sku, product])));
    for (const row of staged) {
      results.push({
        id: row.id,
        rowNo: row.rowNo,
        status: statusOf(row.issues),
        issues: row.issues,
        parsed: row.parsed,
        productId: row.productId,
      });
    }
  }

  for (const part of chunk(results, 500)) {
    const payload = part.map((row) => ({
      id: row.id,
      status: row.status,
      issues: row.issues,
      parsed: row.parsed,
      product_id: row.productId,
    }));
    await tx.execute(sql`
      update app.import_batch_rows r
      set status = v.status, issues = v.issues, parsed = v.parsed, product_id = v.product_id
      from jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
        as v(id uuid, status text, issues jsonb, parsed jsonb, product_id uuid)
      where r.id = v.id and r.batch_id = ${batch.id}`);
  }

  const count = (status: string) => results.filter((row) => row.status === status).length;
  const summary: PreviewSummary = {
    rowCount: results.length,
    validCount: count("VALID"),
    warningCount: count("WARNING"),
    errorCount: count("ERROR"),
    previewHash: sha256Hex(
      canonicalJson({
        mapping,
        rows: results.map((row) => [
          row.rowNo,
          row.status,
          row.parsed,
          row.issues.map((issue) => `${issue.severity}:${issue.code}:${issue.field ?? ""}`),
        ]),
      }),
    ),
  };
  await tx
    .update(importBatches)
    .set({
      columnMapping: mapping,
      rowCount: summary.rowCount,
      validCount: summary.validCount,
      warningCount: summary.warningCount,
      errorCount: summary.errorCount,
      previewHash: summary.previewHash,
      status: summary.errorCount > 0 ? "HAS_ERRORS" : "VALIDATED",
    })
    .where(eq(importBatches.id, batch.id));
  void orgId;
  return summary;
}

/**
 * P-20 (products) / P-22 (opening counts). Stages the file, runs the dry run with a suggested
 * mapping and stores nothing else: no product, no opening line, no stock. The same file (same
 * SHA-256) is never staged twice; the existing batch is returned instead.
 */
export async function uploadImport(
  db: Db,
  actor: Actor,
  raw: z.input<typeof importUploadSchema> & { bytes: Uint8Array },
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string; alreadyUploaded: boolean }>> {
  const { bytes, ...fields } = raw;
  const input = parseOrThrow(importUploadSchema, fields);
  authorize(actor, uploadPermission(input.kind));

  let parsedFile;
  try {
    parsedFile = await parseImportFile(input.fileName, bytes);
  } catch (cause) {
    if (cause instanceof ImportFileError) throw fileError(cause);
    throw cause;
  }
  // Hash of the raw bytes, so a renamed copy of the same file is still recognised.
  const fileSha256 = createHash("sha256").update(bytes).digest("hex");
  const [mapping] = [suggestMapping(parsedFile.headers, input.kind)];

  const run = () =>
    runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "import.upload",
        requestHash: requestHash({
          kind: input.kind,
          fileSha256,
          target: input.targetOpeningBatchId ?? null,
        }),
      });
      if (claim.kind === "REPLAY") {
        return { batchId: claim.resultId!, alreadyUploaded: false, replayed: true };
      }
      await assertActorActive(tx, actor);

      const [existing] = await tx
        .select({ id: importBatches.id })
        .from(importBatches)
        .where(and(eq(importBatches.kind, input.kind), eq(importBatches.fileSha256, fileSha256)));
      if (existing) {
        await completeIdempotencyKey(tx, claim.id, {
          resultType: "IMPORT_BATCH",
          resultId: existing.id,
        });
        return { batchId: existing.id, alreadyUploaded: true, replayed: false };
      }

      if (input.kind === "OPENING_STOCK") {
        const [target] = await tx
          .select()
          .from(openingStockBatches)
          .where(eq(openingStockBatches.id, input.targetOpeningBatchId!))
          .for("update");
        if (!target) throw notFound();
        if (target.status !== "DRAFT") throw openingNotEditable();
      }

      const [batch] = await tx
        .insert(importBatches)
        .values({
          orgId: actor.orgId,
          kind: input.kind,
          fileName: input.fileName,
          fileSha256,
          fileFormat: parsedFile.format,
          fileSizeBytes: bytes.length,
          headers: parsedFile.headers,
          targetOpeningBatchId: input.targetOpeningBatchId ?? null,
          createdBy: actor.userId,
        })
        .returning();
      for (const part of chunk(parsedFile.rows, 500)) {
        await tx.insert(importBatchRows).values(
          part.map((record) => ({
            orgId: actor.orgId,
            batchId: batch!.id,
            rowNo: record.rowNo,
            raw: record.cells,
            status: "ERROR",
          })),
        );
      }
      const summary = await revalidateBatch(tx, actor.orgId, batch!, mapping);
      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "import.upload",
        entityType: ENTITY,
        entityId: batch!.id,
        idempotencyKey,
        afterHash: summary.previewHash,
        details: {
          kind: input.kind,
          format: parsedFile.format,
          sizeBytes: bytes.length,
          fileSha256,
          rows: summary.rowCount,
          valid: summary.validCount,
          warnings: summary.warningCount,
          errors: summary.errorCount,
        },
      });
      await completeIdempotencyKey(tx, claim.id, {
        resultType: "IMPORT_BATCH",
        resultId: batch!.id,
      });
      return { batchId: batch!.id, alreadyUploaded: false, replayed: false };
    });

  try {
    return await run();
  } catch (cause) {
    if (isUniqueViolation(cause, "import_batches_file_uq")) {
      // A concurrent upload of the same file won the race: show that batch.
      const winner = await runInTransaction(
        db,
        { orgId: actor.orgId, actorId: actor.userId },
        (tx) =>
          tx
            .select({ id: importBatches.id })
            .from(importBatches)
            .where(
              and(eq(importBatches.kind, input.kind), eq(importBatches.fileSha256, fileSha256)),
            ),
      );
      if (winner[0]) return { batchId: winner[0].id, alreadyUploaded: true, replayed: false };
    }
    throw cause;
  }
}

export const openingNotEditable = () =>
  new DomainError(
    "OPENING_NOT_EDITABLE",
    "Numërimi fillestar nuk është më në hartim. Hapeni përsëri për ta ndryshuar.",
    409,
  );

async function lockBatch(tx: Tx, batchId: string): Promise<ImportBatchRow> {
  if (!z.uuid().safeParse(batchId).success) throw notFound();
  const [batch] = await tx
    .select()
    .from(importBatches)
    .where(eq(importBatches.id, batchId))
    .for("update");
  if (!batch || !isImportKind(batch.kind)) throw notFound();
  return batch;
}

const alreadyDecided = () =>
  new DomainError("IMPORT_DECIDED", "Ky import është vendosur tashmë dhe nuk ndryshon më.", 409);

/** P-20 / P-22. Changes the column mapping of an undecided batch and repeats the dry run. */
export async function remapImport(
  db: Db,
  actor: Actor,
  raw: z.input<typeof importRemapSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  const input = parseOrThrow(importRemapSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "import.remap",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { batchId: input.batchId, replayed: true };
    const batch = await lockBatch(tx, input.batchId);
    authorize(actor, uploadPermission(batch.kind as ImportKind));
    await assertActorActive(tx, actor);
    if ((DECIDED as readonly string[]).includes(batch.status)) throw alreadyDecided();

    const mapping = cleanMapping(batch.kind as ImportKind, input.mapping);
    const errors = validateMapping(batch.kind as ImportKind, batch.headers as string[], mapping);
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    const summary = await revalidateBatch(tx, actor.orgId, batch, mapping);
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "import.remap",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      beforeHash: batch.previewHash,
      afterHash: summary.previewHash,
      details: {
        kind: batch.kind,
        valid: summary.validCount,
        warnings: summary.warningCount,
        errors: summary.errorCount,
      },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "IMPORT_BATCH", resultId: batch.id });
    return { batchId: batch.id, replayed: false };
  });
}

export interface ApproveResult {
  batchId: string;
  mode: "ALL_OR_NOTHING" | "REVIEWED_PARTIAL";
  approvedRows: number;
  skippedRows: number;
  replayed: boolean;
}

/**
 * CMD-16. All-or-nothing by default: any error row blocks approval. REVIEWED_PARTIAL imports only
 * the rows without errors and needs the approver to type the number of excluded rows. The dry run
 * is repeated inside the transaction; a changed preview aborts without writing a product.
 * PRODUCTS creates products (never stock). OPENING_STOCK fills the DRAFT opening batch's lines
 * (never a stock movement).
 */
export async function approveImport(
  db: Db,
  actor: Actor,
  raw: z.input<typeof importApproveSchema>,
  idempotencyKey: string,
): Promise<ApproveResult> {
  const input = parseOrThrow(importApproveSchema, raw);

  let changed = false;
  let result: ApproveResult | undefined;
  try {
    result = await runInTransaction(
      db,
      { orgId: actor.orgId, actorId: actor.userId },
      async (tx): Promise<ApproveResult | undefined> => {
        const claim = await claimIdempotencyKey(tx, {
          orgId: actor.orgId,
          actorId: actor.userId,
          key: idempotencyKey,
          operation: "import.approve",
          requestHash: requestHash(input),
        });
        if (claim.kind === "REPLAY") {
          const [done] = await tx
            .select()
            .from(importBatches)
            .where(eq(importBatches.id, input.batchId));
          return {
            batchId: input.batchId,
            mode: input.mode,
            approvedRows: done?.approvedRowCount ?? 0,
            skippedRows: Math.max(0, (done?.rowCount ?? 0) - (done?.approvedRowCount ?? 0)),
            replayed: true,
          };
        }
        const batch = await lockBatch(tx, input.batchId);
        const kind = batch.kind as ImportKind;
        authorize(actor, decidePermission(kind));
        await assertActorActive(tx, actor);
        if ((DECIDED as readonly string[]).includes(batch.status)) throw alreadyDecided();

        let target: typeof openingStockBatches.$inferSelect | undefined;
        if (kind === "OPENING_STOCK") {
          [target] = await tx
            .select()
            .from(openingStockBatches)
            .where(eq(openingStockBatches.id, batch.targetOpeningBatchId!))
            .for("update");
          if (!target) throw notFound();
          if (target.status !== "DRAFT") throw openingNotEditable();
        }

        const summary = await revalidateBatch(
          tx,
          actor.orgId,
          batch,
          batch.columnMapping as ColumnMapping,
        );
        if (summary.previewHash !== input.expectedPreviewHash) {
          changed = true;
          await completeIdempotencyKey(tx, claim.id, {
            resultType: "IMPORT_BATCH",
            resultId: batch.id,
          });
          return undefined;
        }

        if (input.mode === "ALL_OR_NOTHING" && summary.errorCount > 0) {
          throw new DomainError(
            "IMPORT_HAS_ERRORS",
            `Importi ka ${summary.errorCount} rreshta me gabime. Korrigjoni skedarin dhe ngarkojeni përsëri, ose zgjidhni miratimin e rishikuar pjesërisht.`,
            409,
          );
        }
        if (input.mode === "REVIEWED_PARTIAL") {
          if (summary.errorCount === 0) {
            throw new DomainError(
              "IMPORT_NO_ERRORS",
              "Nuk ka rreshta me gabime: përdorni miratimin e plotë.",
              409,
            );
          }
          if (input.acknowledgedErrorRows !== summary.errorCount) {
            throw new ValidationError({
              acknowledgedErrorRows: `Shkruani numrin e rreshtave që do të përjashtohen: ${summary.errorCount}.`,
            });
          }
        }
        if (summary.warningCount > 0 && !input.acknowledgeWarnings) {
          throw new ValidationError({
            acknowledgeWarnings: `Konfirmoni që i keni parë ${summary.warningCount} paralajmërimet.`,
          });
        }

        const staged = await tx
          .select()
          .from(importBatchRows)
          .where(
            and(eq(importBatchRows.batchId, batch.id), sql`${importBatchRows.status} <> 'ERROR'`),
          )
          .orderBy(importBatchRows.rowNo);
        if (staged.length === 0) {
          throw new DomainError(
            "IMPORT_EMPTY",
            "Nuk ka asnjë rresht të vlefshëm për t'u importuar.",
            409,
          );
        }

        if (kind === "PRODUCTS") {
          await applyProducts(tx, actor, batch, staged, idempotencyKey);
        } else {
          await applyOpeningLines(tx, actor, target!, staged);
        }
        await tx
          .update(importBatchRows)
          .set({ included: true })
          .where(
            and(eq(importBatchRows.batchId, batch.id), sql`${importBatchRows.status} <> 'ERROR'`),
          );

        await tx
          .update(importBatches)
          .set({
            status: "APPROVED",
            approvalMode: input.mode,
            approvedRowCount: staged.length,
            decidedBy: actor.userId,
            decidedAt: sql`now()`,
            decisionNote: input.note,
          })
          .where(eq(importBatches.id, batch.id));
        await writeAudit(tx, {
          orgId: actor.orgId,
          actor,
          action: "import.approve",
          entityType: ENTITY,
          entityId: batch.id,
          idempotencyKey,
          beforeHash: summary.previewHash,
          details: {
            kind,
            mode: input.mode,
            approvedRows: staged.length,
            skippedRows: summary.rowCount - staged.length,
            warningsAcknowledged: summary.warningCount,
            ...(kind === "OPENING_STOCK" ? { openingBatchId: batch.targetOpeningBatchId } : {}),
          },
        });
        await completeIdempotencyKey(tx, claim.id, {
          resultType: "IMPORT_BATCH",
          resultId: batch.id,
        });
        return {
          batchId: batch.id,
          mode: input.mode,
          approvedRows: staged.length,
          skippedRows: summary.rowCount - staged.length,
          replayed: false,
        };
      },
    );
  } catch (cause) {
    // A product or barcode taken between the dry run and the insert: nothing was written.
    if (
      isUniqueViolation(cause, "products_sku_uq") ||
      isUniqueViolation(cause, "products_barcode_uq")
    ) {
      throw importChanged();
    }
    throw cause;
  }
  if (changed || !result) throw importChanged();
  return result;
}

async function applyProducts(
  tx: Tx,
  actor: Actor,
  batch: ImportBatchRow,
  rows: (typeof importBatchRows.$inferSelect)[],
  idempotencyKey: string,
) {
  const created = new Map<number, string>();
  for (const part of chunk(rows, 500)) {
    const values = part.map((row) => {
      const parsed = row.parsed as ParsedProductRow;
      return {
        orgId: actor.orgId,
        sku: parsed.sku,
        name: parsed.name,
        category: parsed.category,
        unit: parsed.unit,
        barcode: parsed.barcode,
        referencePurchasePrice: parsed.referencePurchasePrice,
        active: true,
      };
    });
    const inserted = await tx
      .insert(products)
      .values(values)
      .returning({ id: products.id, sku: products.sku });
    const bySku = new Map(inserted.map((product) => [product.sku, product.id]));
    for (const row of part)
      created.set(row.rowNo, bySku.get((row.parsed as ParsedProductRow).sku)!);
    await tx.insert(auditEvents).values(
      part.map((row) => {
        const parsed = row.parsed as ParsedProductRow;
        return {
          orgId: actor.orgId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: "product.create",
          entityType: "product",
          entityId: bySku.get(parsed.sku)!,
          idempotencyKey,
          afterHash: productHash({ ...parsed, active: true }),
          safeDetails: sanitizeDetails({
            sku: parsed.sku,
            unit: parsed.unit,
            category: parsed.category,
            source: "import",
            importBatchId: batch.id,
          }) as Record<string, unknown>,
        };
      }),
    );
  }
  for (const part of chunk([...created.entries()], 500)) {
    await tx.execute(sql`
      update app.import_batch_rows r set product_id = v.product_id
      from jsonb_to_recordset(${JSON.stringify(part.map(([rowNo, productId]) => ({ row_no: rowNo, product_id: productId })))}::jsonb)
        as v(row_no int, product_id uuid)
      where r.batch_id = ${batch.id} and r.row_no = v.row_no`);
  }
}

async function applyOpeningLines(
  tx: Tx,
  actor: Actor,
  target: typeof openingStockBatches.$inferSelect,
  rows: (typeof importBatchRows.$inferSelect)[],
) {
  for (const part of chunk(rows, 500)) {
    await tx
      .insert(openingStockLines)
      .values(
        part.map((row) => {
          const parsed = row.parsed as ParsedOpeningRow;
          return {
            orgId: actor.orgId,
            batchId: target.id,
            productId: row.productId!,
            status: parsed.status,
            quantity: parsed.quantity,
            countEvidence: parsed.evidence,
          };
        }),
      )
      .onConflictDoUpdate({
        target: [openingStockLines.batchId, openingStockLines.productId],
        set: {
          status: sql`excluded.status`,
          quantity: sql`excluded.quantity`,
          countEvidence: sql`excluded.count_evidence`,
        },
      });
  }
}

/** P-21 / P-22. Rejects an undecided batch; it stays stored (audit) and has no effect. */
export async function rejectImport(
  db: Db,
  actor: Actor,
  raw: z.input<typeof importRejectSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ batchId: string }>> {
  const input = parseOrThrow(importRejectSchema, raw);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "import.reject",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") return { batchId: input.batchId, replayed: true };
    const batch = await lockBatch(tx, input.batchId);
    authorize(actor, decidePermission(batch.kind as ImportKind));
    await assertActorActive(tx, actor);
    if ((DECIDED as readonly string[]).includes(batch.status)) throw alreadyDecided();
    await tx
      .update(importBatches)
      .set({
        status: "REJECTED",
        decidedBy: actor.userId,
        decidedAt: sql`now()`,
        decisionNote: input.note,
      })
      .where(eq(importBatches.id, batch.id));
    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: "import.reject",
      entityType: ENTITY,
      entityId: batch.id,
      idempotencyKey,
      beforeHash: batch.previewHash,
      details: { kind: batch.kind, rows: batch.rowCount, errors: batch.errorCount },
    });
    await completeIdempotencyKey(tx, claim.id, { resultType: "IMPORT_BATCH", resultId: batch.id });
    return { batchId: batch.id, replayed: false };
  });
}

export interface ImportRowView {
  id: string;
  rowNo: number;
  status: string;
  issues: RowIssue[];
  raw: string[];
  parsed: ParsedProductRow | ParsedOpeningRow | null;
  included: boolean;
}

/** P-44. One batch with its fields, a bounded page of rows (errors first) and the audit trail. */
export async function getImportBatch(
  db: Db,
  actor: Actor,
  batchId: string,
  options: { filter?: "ALL" | "ERRORS" | "WARNINGS"; limit?: number } = {},
) {
  authorize(actor, "P-44");
  if (!z.uuid().safeParse(batchId).success) throw notFound();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [batch] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId));
    if (!batch || !isImportKind(batch.kind)) throw notFound();
    const filter =
      options.filter === "ERRORS"
        ? sql`${importBatchRows.status} = 'ERROR'`
        : options.filter === "WARNINGS"
          ? sql`${importBatchRows.status} = 'WARNING'`
          : undefined;
    const rows = await tx
      .select({
        id: importBatchRows.id,
        rowNo: importBatchRows.rowNo,
        status: importBatchRows.status,
        issues: importBatchRows.issues,
        raw: importBatchRows.raw,
        parsed: importBatchRows.parsed,
        included: importBatchRows.included,
      })
      .from(importBatchRows)
      .where(and(eq(importBatchRows.batchId, batchId), filter))
      .orderBy(
        sql`case ${importBatchRows.status} when 'ERROR' then 0 when 'WARNING' then 1 else 2 end`,
        importBatchRows.rowNo,
      )
      .limit(limit);
    const history = await tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        action: auditEvents.action,
        actorRole: auditEvents.actorRole,
        details: auditEvents.safeDetails,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, ENTITY), eq(auditEvents.entityId, batchId)))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(30);
    return {
      batch,
      kind: batch.kind as ImportKind,
      fields: fieldsFor(batch.kind as ImportKind),
      rows: rows as ImportRowView[],
      shownRows: rows.length,
      history,
    };
  });
}

/** P-44. Newest batches first. */
export async function listImportBatches(db: Db, actor: Actor, kind?: ImportKind) {
  authorize(actor, "P-44");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, (tx) =>
    tx
      .select({
        id: importBatches.id,
        kind: importBatches.kind,
        fileName: importBatches.fileName,
        status: importBatches.status,
        rowCount: importBatches.rowCount,
        validCount: importBatches.validCount,
        warningCount: importBatches.warningCount,
        errorCount: importBatches.errorCount,
        approvedRowCount: importBatches.approvedRowCount,
        createdAt: importBatches.createdAt,
      })
      .from(importBatches)
      .where(kind ? eq(importBatches.kind, kind) : undefined)
      .orderBy(desc(importBatches.createdAt))
      .limit(50),
  );
}

export const IMPORT_FILE_LIMIT_MB = IMPORT_LIMITS.maxFileBytes / (1024 * 1024);
