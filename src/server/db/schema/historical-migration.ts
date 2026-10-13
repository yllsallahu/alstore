import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  currency,
  enumCheck,
  eurCheck,
  id,
  instant,
  localDate,
  money,
  oneOfList,
  orgId,
  sha256Check,
} from "./_base";
import { users } from "./auth-audit";
import {
  IMPORT_APPROVAL_MODES,
  IMPORT_BATCH_KINDS,
  IMPORT_BATCH_STATUSES,
  IMPORT_FILE_FORMATS,
  IMPORT_ROW_STATUSES,
  OBLIGATION_DIRECTIONS,
  OBLIGATION_STATUSES,
} from "./enums";
import { openingStockBatches, products } from "./catalog-inventory";
import { customers, suppliers } from "./parties";

/**
 * One uploaded file = one batch. The raw rows are staged in `import_batch_rows`; the original
 * file is not stored (private document storage is not available yet, RG-03) — its SHA-256 is.
 * PRODUCTS creates products; OPENING_STOCK fills the lines of a DRAFT opening-stock batch.
 * Neither ever creates a sale, tax record, invoice number or stock movement (CMD-16).
 */
export const importBatches = app.table(
  "import_batches",
  {
    id: id(),
    orgId: orgId(),
    kind: text("kind").notNull(),
    fileName: text("file_name").notNull(),
    fileSha256: text("file_sha256").notNull(),
    fileFormat: text("file_format").notNull().default("CSV"),
    fileSizeBytes: integer("file_size_bytes").notNull().default(0),
    status: text("status").notNull().default("UPLOADED"),
    rowCount: integer("row_count").notNull().default(0),
    validCount: integer("valid_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    headers: jsonb("headers").notNull().default([]),
    columnMapping: jsonb("column_mapping").notNull().default({}),
    /** Hash of every row's status and normalized values; approval must present the same hash. */
    previewHash: text("preview_hash"),
    targetOpeningBatchId: uuid("target_opening_batch_id").references(() => openingStockBatches.id),
    approvalMode: text("approval_mode"),
    approvedRowCount: integer("approved_row_count"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: instant("decided_at"),
    decisionNote: text("decision_note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("import_batches_file_uq").on(t.orgId, t.kind, t.fileSha256),
    enumCheck("import_batches_kind_ck", t.kind, IMPORT_BATCH_KINDS),
    enumCheck("import_batches_status_ck", t.status, IMPORT_BATCH_STATUSES),
    enumCheck("import_batches_format_ck", t.fileFormat, IMPORT_FILE_FORMATS),
    sha256Check("import_batches_sha_ck", t.fileSha256),
    check(
      "import_batches_preview_hash_ck",
      sql`${t.previewHash} is null or ${t.previewHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "import_batches_counts_ck",
      sql`${t.rowCount} >= 0 and ${t.errorCount} >= 0 and ${t.validCount} >= 0 and ${t.warningCount} >= 0
        and ${t.fileSizeBytes} >= 0`,
    ),
    check(
      "import_batches_approval_mode_ck",
      sql`${t.approvalMode} is null or ${t.approvalMode} in ${oneOfList(IMPORT_APPROVAL_MODES)}`,
    ),
    check(
      "import_batches_decided_ck",
      sql`(${t.status} in ('APPROVED', 'REJECTED')) = (${t.decidedBy} is not null and ${t.decidedAt} is not null)`,
    ),
    check(
      "import_batches_approved_ck",
      sql`(${t.status} = 'APPROVED') = (${t.approvalMode} is not null and ${t.approvedRowCount} is not null)`,
    ),
    check(
      "import_batches_target_ck",
      sql`(${t.kind} = 'OPENING_STOCK') = (${t.targetOpeningBatchId} is not null)`,
    ),
  ],
);

/** Staged rows of an import batch. Editable only while the batch is not APPROVED/REJECTED. */
export const importBatchRows = app.table(
  "import_batch_rows",
  {
    id: id(),
    orgId: orgId(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id),
    /** Row number as the owner sees it in the file (header = 1). */
    rowNo: integer("row_no").notNull(),
    raw: jsonb("raw").notNull(),
    status: text("status").notNull(),
    issues: jsonb("issues").notNull().default([]),
    parsed: jsonb("parsed"),
    /** PRODUCTS: the product created at approval. OPENING_STOCK: the matched product. */
    productId: uuid("product_id").references(() => products.id),
    included: boolean("included").notNull().default(false),
  },
  (t) => [
    unique("import_batch_rows_no_uq").on(t.batchId, t.rowNo),
    enumCheck("import_batch_rows_status_ck", t.status, IMPORT_ROW_STATUSES),
    check("import_batch_rows_no_ck", sql`${t.rowNo} >= 1`),
    index("import_batch_rows_batch_status_idx").on(t.batchId, t.status),
  ],
);

/**
 * Pre-cutover open invoices. Never a tax invoice, stock movement, sale, expense, book line or
 * invoice number. Only APPROVED records accept allocations.
 */
export const historicalObligations = app.table(
  "historical_obligations",
  {
    id: id(),
    orgId: orgId(),
    direction: text("direction").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    partyId: uuid("party_id")
      .notNull()
      .generatedAlwaysAs(sql`coalesce(customer_id, supplier_id)`),
    originalSeries: text("original_series"),
    originalNumber: text("original_number").notNull(),
    normalizedIdentity: text("normalized_identity").notNull(),
    originalIssueDate: localDate("original_issue_date").notNull(),
    originalTotal: money("original_total"),
    openBalanceAtImport: money("open_balance_at_import").notNull(),
    currency: currency(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id),
    status: text("status").notNull().default("STAGED"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("historical_obligations_identity_uq").on(t.direction, t.partyId, t.normalizedIdentity),
    enumCheck("historical_obligations_direction_ck", t.direction, OBLIGATION_DIRECTIONS),
    enumCheck("historical_obligations_status_ck", t.status, OBLIGATION_STATUSES),
    eurCheck("historical_obligations_currency_ck", t.currency),
    check(
      "historical_obligations_party_ck",
      sql`(${t.direction} = 'RECEIVABLE' and ${t.customerId} is not null and ${t.supplierId} is null)
        or (${t.direction} = 'PAYABLE' and ${t.supplierId} is not null and ${t.customerId} is null)`,
    ),
    check("historical_obligations_balance_ck", sql`${t.openBalanceAtImport} >= 0`),
  ],
);
