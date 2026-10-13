import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  currency,
  enumCheck,
  eurCheck,
  fk,
  id,
  instant,
  localDate,
  money,
  orgId,
  quantity,
  unitPrice,
} from "./_base";
import { users } from "./auth-audit";
import { products } from "./catalog-inventory";
import { RECEIPT_STATUSES, REGISTRATION_STATUSES, TAX_CLASSIFICATION_STATUSES } from "./enums";
import { suppliers } from "./parties";

/** Never posts stock; only a POSTED goods receipt does. */
export const purchaseInvoices = app.table(
  "purchase_invoices",
  {
    id: id(),
    orgId: orgId(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    supplierInvoiceNumber: text("supplier_invoice_number").notNull(),
    normalizedNumber: text("normalized_number").notNull(),
    invoiceDate: localDate("invoice_date").notNull(),
    receivedDocDate: localDate("received_doc_date"),
    currency: currency(),
    totalNet: money("total_net"),
    totalVat: money("total_vat"),
    totalGross: money("total_gross"),
    status: text("status").notNull().default("DRAFT"),
    taxClassificationStatus: text("tax_classification_status").notNull().default("UNCLASSIFIED"),
    preCutover: boolean("pre_cutover").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("purchase_invoices_number_uq").on(t.supplierId, t.normalizedNumber),
    enumCheck("purchase_invoices_status_ck", t.status, REGISTRATION_STATUSES),
    enumCheck("purchase_invoices_tax_ck", t.taxClassificationStatus, TAX_CLASSIFICATION_STATUSES),
    eurCheck("purchase_invoices_currency_ck", t.currency),
    check(
      "purchase_invoices_totals_ck",
      sql`${t.totalGross} is null or ${t.totalGross} = ${t.totalNet} + ${t.totalVat}`,
    ),
  ],
);

/** Purchase price stays exactly as invoiced; customs and transport are never folded in. */
export const purchaseInvoiceLines = app.table(
  "purchase_invoice_lines",
  {
    id: id(),
    orgId: orgId(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => purchaseInvoices.id),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: quantity("quantity").notNull(),
    unitPriceNet: unitPrice("unit_price_net").notNull(),
    lineNet: money("line_net").notNull(),
  },
  (t) => [
    unique("purchase_invoice_lines_uq").on(t.invoiceId, t.lineNo),
    check("purchase_invoice_lines_qty_ck", sql`${t.quantity} > 0`),
    check("purchase_invoice_lines_price_ck", sql`${t.unitPriceNet} >= 0`),
  ],
);

/** DUD. Customs amount fields depend on OLD-07 and are kept as reviewed JSON until decided. */
export const importDeclarations = app.table(
  "import_declarations",
  {
    id: id(),
    orgId: orgId(),
    customsReference: text("customs_reference").notNull(),
    declarationDate: localDate("declaration_date").notNull(),
    brokerSupplierId: uuid("broker_supplier_id").references(() => suppliers.id),
    customsValue: money("customs_value"),
    customsAmounts: jsonb("customs_amounts").notNull().default({}),
    importVatAmount: money("import_vat_amount"),
    status: text("status").notNull().default("DRAFT"),
    taxClassificationStatus: text("tax_classification_status").notNull().default("UNCLASSIFIED"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("import_declarations_reference_uq").on(t.orgId, t.customsReference),
    enumCheck("import_declarations_status_ck", t.status, REGISTRATION_STATUSES),
    enumCheck("import_declarations_tax_ck", t.taxClassificationStatus, TAX_CLASSIFICATION_STATUSES),
  ],
);

/** Physical receipt: the only purchase-side stock source. */
export const goodsReceipts = app.table(
  "goods_receipts",
  {
    id: id(),
    orgId: orgId(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    receivedAt: instant("received_at").notNull(),
    documentDate: localDate("document_date").notNull(),
    status: text("status").notNull().default("DRAFT"),
    coveredByOpeningCount: boolean("covered_by_opening_count").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    postedBy: uuid("posted_by").references(() => users.id),
    postedAt: instant("posted_at"),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("goods_receipts_status_ck", t.status, RECEIPT_STATUSES),
    check(
      "goods_receipts_posted_ck",
      sql`(${t.status} = 'POSTED') = (${t.postedAt} is not null and ${t.postedBy} is not null)`,
    ),
  ],
);

export const goodsReceiptLines = app.table(
  "goods_receipt_lines",
  {
    id: id(),
    orgId: orgId(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => goodsReceipts.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    receivedQuantity: quantity("received_quantity").notNull(),
    expectedQuantity: quantity("expected_quantity"),
    purchaseInvoiceLineId: uuid("purchase_invoice_line_id"),
    discrepancyNote: text("discrepancy_note"),
  },
  (t) => [
    fk("goods_receipt_lines_invoice_line_fk", t.purchaseInvoiceLineId, purchaseInvoiceLines.id),
    check("goods_receipt_lines_qty_ck", sql`${t.receivedQuantity} > 0`),
    check(
      "goods_receipt_lines_expected_ck",
      sql`${t.expectedQuantity} is null or ${t.expectedQuantity} > 0`,
    ),
    index("goods_receipt_lines_receipt_idx").on(t.receiptId),
  ],
);

/** N:M links between a DUD and supplier invoices / goods receipts. Exactly one target per row. */
export const importDeclarationLinks = app.table(
  "import_declaration_links",
  {
    id: id(),
    orgId: orgId(),
    importDeclarationId: uuid("import_declaration_id").notNull(),
    purchaseInvoiceId: uuid("purchase_invoice_id"),
    goodsReceiptId: uuid("goods_receipt_id").references(() => goodsReceipts.id),
    createdAt: createdAt(),
  },
  (t) => [
    fk("import_declaration_links_declaration_fk", t.importDeclarationId, importDeclarations.id),
    fk("import_declaration_links_invoice_fk", t.purchaseInvoiceId, purchaseInvoices.id),
    check(
      "import_declaration_links_target_ck",
      sql`num_nonnulls(${t.purchaseInvoiceId}, ${t.goodsReceiptId}) = 1`,
    ),
    unique("import_declaration_links_invoice_uq")
      .on(t.importDeclarationId, t.purchaseInvoiceId)
      .nullsNotDistinct(),
    unique("import_declaration_links_receipt_uq")
      .on(t.importDeclarationId, t.goodsReceiptId)
      .nullsNotDistinct(),
  ],
);
