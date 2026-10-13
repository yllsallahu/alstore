import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  enumCheck,
  id,
  instant,
  localDate,
  orgId,
  quantity,
  stampedAt,
  unitPrice,
  updatedAt,
  version,
} from "./_base";
import { approvals, users } from "./auth-audit";
import { documentFiles } from "./documents";
import {
  ADJUSTMENT_KINDS,
  FOUR_EYES_STATUSES,
  MOVEMENT_SOURCES,
  MOVEMENT_TYPES,
  OPENING_BATCH_STATUSES,
  OPENING_LINE_STATUSES,
  PRODUCT_CATEGORIES,
  UNIT_CHANGE_STATUSES,
  UNITS,
} from "./enums";
import { cutoverPlans } from "./settings";

export const products = app.table(
  "products",
  {
    id: id(),
    orgId: orgId(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    unit: text("unit").notNull(),
    barcode: text("barcode"),
    referencePurchasePrice: unitPrice("reference_purchase_price"),
    active: boolean("active").notNull().default(true),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("products_sku_uq").on(t.orgId, t.sku),
    check("products_sku_ck", sql`${t.sku} <> '' and ${t.sku} = btrim(${t.sku})`),
    // Canonical SKU: upper case, so "al-01" and "AL-01" can never be two products.
    check("products_sku_format_ck", sql`${t.sku} ~ '^[A-Z0-9][A-Z0-9./_-]{0,39}$'`),
    check("products_name_ck", sql`btrim(${t.name}) <> '' and char_length(${t.name}) <= 200`),
    check("products_barcode_ck", sql`${t.barcode} is null or ${t.barcode} ~ '^[A-Z0-9-]{4,64}$'`),
    enumCheck("products_category_ck", t.category, PRODUCT_CATEGORIES),
    enumCheck("products_unit_ck", t.unit, UNITS),
    check(
      "products_reference_price_ck",
      sql`${t.referencePurchasePrice} is null or ${t.referencePurchasePrice} >= 0`,
    ),
    uniqueIndex("products_barcode_uq")
      .on(t.orgId, t.barcode)
      .where(sql`${t.barcode} is not null`),
    index("products_sku_prefix_idx").on(t.orgId, t.sku.op("text_pattern_ops")),
  ],
);

/**
 * INV-05 exception path: an explicit, audited, four-eyes approved unit migration for a product
 * that already has stock movements. Applied only at zero on-hand stock; no unit conversion.
 */
export const productUnitChanges = app.table(
  "product_unit_changes",
  {
    id: id(),
    orgId: orgId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    fromUnit: text("from_unit").notNull(),
    toUnit: text("to_unit").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("PENDING_APPROVAL"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    requestedAt: stampedAt("requested_at"),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: instant("decided_at"),
    decisionComment: text("decision_comment"),
    approvalId: uuid("approval_id").references(() => approvals.id),
  },
  (t) => [
    enumCheck("product_unit_changes_from_ck", t.fromUnit, UNITS),
    enumCheck("product_unit_changes_to_ck", t.toUnit, UNITS),
    enumCheck("product_unit_changes_status_ck", t.status, UNIT_CHANGE_STATUSES),
    check("product_unit_changes_units_ck", sql`${t.fromUnit} <> ${t.toUnit}`),
    check(
      "product_unit_changes_reason_ck",
      sql`btrim(${t.reason}) <> '' and char_length(${t.reason}) <= 500`,
    ),
    check(
      "product_unit_changes_decided_ck",
      sql`(${t.status} = 'PENDING_APPROVAL') = (${t.decidedBy} is null and ${t.decidedAt} is null)`,
    ),
    // SOD-3: approver and rejecter differ from the requester; only the requester cancels.
    check(
      "product_unit_changes_four_eyes_ck",
      sql`${t.status} not in ('APPROVED_APPLIED', 'REJECTED') or ${t.decidedBy} <> ${t.requestedBy}`,
    ),
    check(
      "product_unit_changes_cancel_ck",
      sql`${t.status} <> 'CANCELLED' or ${t.decidedBy} = ${t.requestedBy}`,
    ),
    check(
      "product_unit_changes_approval_ck",
      sql`${t.status} <> 'APPROVED_APPLIED' or ${t.approvalId} is not null`,
    ),
    uniqueIndex("product_unit_changes_one_pending_uq")
      .on(t.productId)
      .where(sql`${t.status} = 'PENDING_APPROVAL'`),
  ],
);

export const openingStockBatches = app.table(
  "opening_stock_batches",
  {
    id: id(),
    orgId: orgId(),
    cutoverPlanId: uuid("cutover_plan_id")
      .notNull()
      .references(() => cutoverPlans.id),
    status: text("status").notNull().default("DRAFT"),
    countedAsOf: localDate("counted_as_of").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("opening_stock_batches_status_ck", t.status, OPENING_BATCH_STATUSES),
    uniqueIndex("opening_stock_batches_one_posted_uq")
      .on(t.orgId)
      .where(sql`${t.status} = 'POSTED'`),
  ],
);

export const openingStockLines = app.table(
  "opening_stock_lines",
  {
    id: id(),
    orgId: orgId(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => openingStockBatches.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    status: text("status").notNull(),
    quantity: quantity("quantity"),
    countEvidence: text("count_evidence"),
  },
  (t) => [
    unique("opening_stock_lines_product_uq").on(t.batchId, t.productId),
    enumCheck("opening_stock_lines_status_ck", t.status, OPENING_LINE_STATUSES),
    check(
      "opening_stock_lines_qty_ck",
      sql`(${t.status} = 'VERIFIED_QTY' and ${t.quantity} > 0)
        or (${t.status} = 'VERIFIED_ZERO' and ${t.quantity} = 0)
        or (${t.status} = 'UNKNOWN' and ${t.quantity} is null)`,
    ),
  ],
);

const movementPairs = Object.entries(MOVEMENT_SOURCES)
  .map(([type, source]) => `('${type}', '${source}')`)
  .join(", ");

/** One header per physical source event; append-only. */
export const stockEvents = app.table(
  "stock_events",
  {
    id: id(),
    orgId: orgId(),
    eventType: text("event_type").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    effectiveAt: instant("effective_at").notNull().defaultNow(),
    documentDate: localDate("document_date").notNull(),
    postedBy: uuid("posted_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("stock_events_source_uq").on(t.sourceType, t.sourceId),
    enumCheck("stock_events_type_ck", t.eventType, MOVEMENT_TYPES),
    check(
      "stock_events_source_ck",
      sql`(${t.eventType}, ${t.sourceType}) in (${sql.raw(movementPairs)})`,
    ),
  ],
);

/** Append-only ledger lines. Balance read model: stock_balances. */
export const stockMovements = app.table(
  "stock_movements",
  {
    id: id(),
    orgId: orgId(),
    stockEventId: uuid("stock_event_id")
      .notNull()
      .references(() => stockEvents.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantityDelta: quantity("quantity_delta").notNull(),
    unit: text("unit").notNull(),
    sourceType: text("source_type").notNull(),
    movementType: text("movement_type").notNull(),
    sourceLineId: uuid("source_line_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("stock_movements_source_line_uq").on(t.sourceType, t.sourceLineId),
    uniqueIndex("stock_movements_one_opening_uq")
      .on(t.productId)
      .where(sql`${t.movementType} = 'OPENING'`),
    check("stock_movements_nonzero_ck", sql`${t.quantityDelta} <> 0`),
    check(
      "stock_movements_sign_ck",
      sql`(${t.movementType} not in ('OPENING', 'PURCHASE_RECEIPT') or ${t.quantityDelta} > 0)
        and (${t.movementType} <> 'SALE_FULFILLMENT' or ${t.quantityDelta} < 0)`,
    ),
    enumCheck("stock_movements_unit_ck", t.unit, UNITS),
    enumCheck("stock_movements_type_ck", t.movementType, MOVEMENT_TYPES),
    index("stock_movements_product_idx").on(t.productId, t.createdAt),
    index("stock_movements_event_idx").on(t.stockEventId),
  ],
);

/** Read model, exactly one row per product (created by trigger with the product). */
export const stockBalances = app.table(
  "stock_balances",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id),
    orgId: orgId(),
    onHand: quantity("on_hand").notNull().default("0"),
    lastMovementId: uuid("last_movement_id").references((): AnyPgColumn => stockMovements.id),
    version: integer("version").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [check("stock_balances_non_negative_ck", sql`${t.onHand} >= 0`)],
);

export const inventoryAdjustments = app.table(
  "inventory_adjustments",
  {
    id: id(),
    orgId: orgId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    kind: text("kind").notNull(),
    quantityDelta: quantity("quantity_delta").notNull(),
    reason: text("reason").notNull(),
    evidenceDocumentId: uuid("evidence_document_id").references(() => documentFiles.id),
    status: text("status").notNull().default("DRAFT"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("inventory_adjustments_kind_ck", t.kind, ADJUSTMENT_KINDS),
    enumCheck("inventory_adjustments_status_ck", t.status, FOUR_EYES_STATUSES),
    check("inventory_adjustments_nonzero_ck", sql`${t.quantityDelta} <> 0`),
    check("inventory_adjustments_reason_ck", sql`btrim(${t.reason}) <> ''`),
    check(
      "inventory_adjustments_approved_ck",
      sql`${t.status} <> 'APPROVED_POSTED' or ${t.approvalId} is not null`,
    ),
  ],
);
