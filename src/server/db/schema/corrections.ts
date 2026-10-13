import { sql } from "drizzle-orm";
import { check, index, integer, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  enumCheck,
  fk,
  id,
  instant,
  money,
  orgId,
  quantity,
  unitPrice,
} from "./_base";
import { approvals, users } from "./auth-audit";
import {
  CORRECTION_KINDS,
  CORRECTION_REASONS,
  CORRECTION_STATUSES,
  FOUR_EYES_STATUSES,
} from "./enums";
import {
  fulfillmentLines,
  fulfillments,
  invoiceSeries,
  taxInvoiceLines,
  taxInvoices,
} from "./sales-invoicing";
import { taxPeriods, taxSnapshots } from "./tax-reporting";

/** Legal kind set per OLD-06. Never posts stock. Immutable once ISSUED (trigger). */
export const correctionDocuments = app.table(
  "correction_documents",
  {
    id: id(),
    orgId: orgId(),
    kind: text("kind").notNull(),
    originalInvoiceId: uuid("original_invoice_id")
      .notNull()
      .references(() => taxInvoices.id),
    seriesId: uuid("series_id").references(() => invoiceSeries.id),
    number: integer("number"),
    reasonCode: text("reason_code").notNull(),
    reasonComment: text("reason_comment"),
    status: text("status").notNull().default("DRAFT"),
    totalNet: money("total_net"),
    totalVat: money("total_vat"),
    totalGross: money("total_gross"),
    taxSnapshotId: uuid("tax_snapshot_id").references(() => taxSnapshots.id),
    targetPeriodId: uuid("target_period_id").references(() => taxPeriods.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    issuedBy: uuid("issued_by").references(() => users.id),
    issuedAt: instant("issued_at"),
  },
  (t) => [
    unique("correction_documents_number_uq").on(t.seriesId, t.number),
    enumCheck("correction_documents_kind_ck", t.kind, CORRECTION_KINDS),
    enumCheck("correction_documents_reason_ck", t.reasonCode, CORRECTION_REASONS),
    enumCheck("correction_documents_status_ck", t.status, CORRECTION_STATUSES),
    check(
      "correction_documents_other_reason_ck",
      sql`${t.reasonCode} <> 'OTHER' or btrim(coalesce(${t.reasonComment}, '')) <> ''`,
    ),
    check(
      "correction_documents_issued_ck",
      sql`${t.status} <> 'ISSUED' or (${t.seriesId} is not null and ${t.number} is not null
        and ${t.issuedAt} is not null and ${t.issuedBy} is not null and ${t.taxSnapshotId} is not null
        and ${t.totalGross} is not null)`,
    ),
    index("correction_documents_original_idx").on(t.originalInvoiceId),
  ],
);

export const correctionDocumentLines = app.table(
  "correction_document_lines",
  {
    id: id(),
    orgId: orgId(),
    correctionId: uuid("correction_id").notNull(),
    originalInvoiceLineId: uuid("original_invoice_line_id"),
    quantityDelta: quantity("quantity_delta"),
    priceDelta: unitPrice("price_delta"),
    netDelta: money("net_delta").notNull(),
    vatDelta: money("vat_delta").notNull(),
  },
  (t) => [
    fk("correction_document_lines_correction_fk", t.correctionId, correctionDocuments.id),
    fk("correction_document_lines_invoice_line_fk", t.originalInvoiceLineId, taxInvoiceLines.id),
    index("correction_document_lines_correction_idx").on(t.correctionId),
  ],
);

/** Physical truth correction, independent of any financial correction document. Four-eyes. */
export const fulfillmentCorrections = app.table(
  "fulfillment_corrections",
  {
    id: id(),
    orgId: orgId(),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id),
    linkedCorrectionDocumentId: uuid("linked_correction_document_id"),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("DRAFT"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdAt: createdAt(),
  },
  (t) => [
    fk(
      "fulfillment_corrections_correction_document_fk",
      t.linkedCorrectionDocumentId,
      correctionDocuments.id,
    ),
    enumCheck("fulfillment_corrections_status_ck", t.status, FOUR_EYES_STATUSES),
    check("fulfillment_corrections_reason_ck", sql`btrim(${t.reason}) <> ''`),
    check(
      "fulfillment_corrections_approved_ck",
      sql`${t.status} <> 'APPROVED_POSTED' or ${t.approvalId} is not null`,
    ),
  ],
);

export const fulfillmentCorrectionLines = app.table(
  "fulfillment_correction_lines",
  {
    id: id(),
    orgId: orgId(),
    fulfillmentCorrectionId: uuid("fulfillment_correction_id").notNull(),
    fulfillmentLineId: uuid("fulfillment_line_id").notNull(),
    quantityDelta: quantity("quantity_delta").notNull(),
  },
  (t) => [
    fk(
      "fulfillment_correction_lines_correction_fk",
      t.fulfillmentCorrectionId,
      fulfillmentCorrections.id,
    ),
    fk("fulfillment_correction_lines_line_fk", t.fulfillmentLineId, fulfillmentLines.id),
    unique("fulfillment_correction_lines_uq").on(t.fulfillmentCorrectionId, t.fulfillmentLineId),
    check("fulfillment_correction_lines_nonzero_ck", sql`${t.quantityDelta} <> 0`),
  ],
);
