import { sql } from "drizzle-orm";
import { check, integer, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  currency,
  enumCheck,
  eurCheck,
  id,
  localDate,
  money,
  orgId,
  sha256Check,
} from "./_base";
import { users } from "./auth-audit";
import {
  IMPORT_BATCH_KINDS,
  IMPORT_BATCH_STATUSES,
  OBLIGATION_DIRECTIONS,
  OBLIGATION_STATUSES,
} from "./enums";
import { customers, suppliers } from "./parties";

export const importBatches = app.table(
  "import_batches",
  {
    id: id(),
    orgId: orgId(),
    kind: text("kind").notNull(),
    fileName: text("file_name").notNull(),
    fileSha256: text("file_sha256").notNull(),
    status: text("status").notNull().default("UPLOADED"),
    rowCount: integer("row_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("import_batches_file_uq").on(t.orgId, t.kind, t.fileSha256),
    enumCheck("import_batches_kind_ck", t.kind, IMPORT_BATCH_KINDS),
    enumCheck("import_batches_status_ck", t.status, IMPORT_BATCH_STATUSES),
    sha256Check("import_batches_sha_ck", t.fileSha256),
    check("import_batches_counts_ck", sql`${t.rowCount} >= 0 and ${t.errorCount} >= 0`),
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
