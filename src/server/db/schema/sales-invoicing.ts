import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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
  orgId,
  quantity,
  sha256Check,
  stampedAt,
  unitPrice,
  updatedAt,
  version,
} from "./_base";
import { approvals, users } from "./auth-audit";
import { products } from "./catalog-inventory";
import { SALE_STATUSES, SERIES_KINDS, SERIES_STATUSES, UNITS } from "./enums";
import { customers } from "./parties";
import { taxSnapshots } from "./tax-reporting";

export const sales = app.table(
  "sales",
  {
    id: id(),
    orgId: orgId(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    status: text("status").notNull().default("DRAFT"),
    version: version(),
    paymentTermDays: integer("payment_term_days").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    confirmedAt: instant("confirmed_at"),
  },
  (t) => [
    enumCheck("sales_status_ck", t.status, SALE_STATUSES),
    check("sales_payment_term_ck", sql`${t.paymentTermDays} > 0`),
    check("sales_confirmed_ck", sql`(${t.status} = 'CONFIRMED') = (${t.confirmedAt} is not null)`),
  ],
);

/** No discount column by design (spec A.3). One line per SKU per sale (OWN-15). */
export const saleLines = app.table(
  "sale_lines",
  {
    id: id(),
    orgId: orgId(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: quantity("quantity").notNull(),
    unit: text("unit").notNull(),
    unitPriceNet: unitPrice("unit_price_net").notNull(),
  },
  (t) => [
    unique("sale_lines_line_uq").on(t.saleId, t.lineNo),
    unique("sale_lines_product_uq").on(t.saleId, t.productId),
    check("sale_lines_line_no_ck", sql`${t.lineNo} > 0`),
    check("sale_lines_qty_ck", sql`${t.quantity} > 0`),
    check("sale_lines_price_ck", sql`${t.unitPriceNet} >= 0`),
    enumCheck("sale_lines_unit_ck", t.unit, UNITS),
  ],
);

/** Gapless counter row locked FOR UPDATE at issuance; never a PostgreSQL SEQUENCE. */
export const invoiceSeries = app.table(
  "invoice_series",
  {
    id: id(),
    orgId: orgId(),
    fiscalYear: integer("fiscal_year").notNull(),
    kind: text("kind").notNull(),
    code: text("code").notNull(),
    legacyLastNumber: integer("legacy_last_number"),
    nextNumber: integer("next_number").notNull(),
    status: text("status").notNull().default("PROPOSED"),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("invoice_series_uq").on(t.orgId, t.fiscalYear, t.kind, t.code),
    uniqueIndex("invoice_series_one_active_uq")
      .on(t.orgId, t.fiscalYear, t.kind)
      .where(sql`${t.status} = 'ACTIVE'`),
    enumCheck("invoice_series_kind_ck", t.kind, SERIES_KINDS),
    enumCheck("invoice_series_status_ck", t.status, SERIES_STATUSES),
    check("invoice_series_year_ck", sql`${t.fiscalYear} between 2000 and 2100`),
    check("invoice_series_next_ck", sql`${t.nextNumber} >= 1`),
    check(
      "invoice_series_legacy_ck",
      sql`${t.legacyLastNumber} is null or ${t.legacyLastNumber} >= 0`,
    ),
    check(
      "invoice_series_approved_ck",
      sql`${t.status} not in ('ACCOUNTANT_APPROVED', 'ACTIVE') or ${t.approvalId} is not null`,
    ),
  ],
);

/** Immutable on insert. Payment status is derived, never stored here. */
export const taxInvoices = app.table(
  "tax_invoices",
  {
    id: id(),
    orgId: orgId(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => invoiceSeries.id),
    number: integer("number").notNull(),
    documentDate: localDate("document_date").notNull(),
    dueDate: localDate("due_date").notNull(),
    issuedAt: instant("issued_at").notNull().defaultNow(),
    issuedBy: uuid("issued_by")
      .notNull()
      .references(() => users.id),
    buyerSnapshot: jsonb("buyer_snapshot").notNull(),
    sellerSnapshot: jsonb("seller_snapshot").notNull(),
    currency: currency(),
    totalNet: money("total_net").notNull(),
    totalVat: money("total_vat").notNull(),
    totalGross: money("total_gross").notNull(),
    taxSnapshotId: uuid("tax_snapshot_id")
      .notNull()
      .references(() => taxSnapshots.id),
    legalTemplateVersion: text("legal_template_version").notNull(),
  },
  (t) => [
    unique("tax_invoices_sale_uq").on(t.saleId),
    unique("tax_invoices_number_uq").on(t.seriesId, t.number),
    check("tax_invoices_number_ck", sql`${t.number} > 0`),
    check("tax_invoices_due_ck", sql`${t.dueDate} >= ${t.documentDate}`),
    check("tax_invoices_totals_ck", sql`${t.totalGross} = ${t.totalNet} + ${t.totalVat}`),
    eurCheck("tax_invoices_currency_ck", t.currency),
  ],
);

/** Immutable snapshot of each line, not a reference to mutable product data. */
export const taxInvoiceLines = app.table(
  "tax_invoice_lines",
  {
    id: id(),
    orgId: orgId(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => taxInvoices.id),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    unit: text("unit").notNull(),
    quantity: quantity("quantity").notNull(),
    unitPriceNet: unitPrice("unit_price_net").notNull(),
    lineNet: money("line_net").notNull(),
    vatCategory: text("vat_category").notNull(),
    vatRate: numeric("vat_rate", { precision: 9, scale: 4 }),
    lineVat: money("line_vat").notNull(),
  },
  (t) => [
    unique("tax_invoice_lines_uq").on(t.invoiceId, t.lineNo),
    check("tax_invoice_lines_qty_ck", sql`${t.quantity} > 0`),
    check("tax_invoice_lines_price_ck", sql`${t.unitPriceNet} >= 0`),
    enumCheck("tax_invoice_lines_unit_ck", t.unit, UNITS),
  ],
);

export const fulfillments = app.table(
  "fulfillments",
  {
    id: id(),
    orgId: orgId(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => taxInvoices.id),
    deliveredAt: instant("delivered_at").notNull().defaultNow(),
    documentDate: localDate("document_date").notNull(),
    handedOverBy: uuid("handed_over_by")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("POSTED"),
  },
  (t) => [
    unique("fulfillments_sale_uq").on(t.saleId),
    unique("fulfillments_invoice_uq").on(t.invoiceId),
    check("fulfillments_status_ck", sql`${t.status} = 'POSTED'`),
  ],
);

export const fulfillmentLines = app.table(
  "fulfillment_lines",
  {
    id: id(),
    orgId: orgId(),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id),
    saleLineId: uuid("sale_line_id")
      .notNull()
      .references(() => saleLines.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: quantity("quantity").notNull(),
  },
  (t) => [
    unique("fulfillment_lines_sale_line_uq").on(t.saleLineId),
    check("fulfillment_lines_qty_ck", sql`${t.quantity} > 0`),
    index("fulfillment_lines_fulfillment_idx").on(t.fulfillmentId),
  ],
);

/** Many renders allowed; none changes business state. */
export const invoicePdfRenders = app.table(
  "invoice_pdf_renders",
  {
    id: id(),
    orgId: orgId(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => taxInvoices.id),
    renderNo: integer("render_no").notNull(),
    templateVersion: text("template_version").notNull(),
    storageObject: text("storage_object").notNull(),
    sha256: text("sha256").notNull(),
    renderedAt: stampedAt("rendered_at"),
  },
  (t) => [
    unique("invoice_pdf_renders_uq").on(t.invoiceId, t.renderNo),
    sha256Check("invoice_pdf_renders_sha_ck", t.sha256),
  ],
);
