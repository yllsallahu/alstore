import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, text, unique, uuid } from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  currency,
  enumCheck,
  eurCheck,
  fk,
  id,
  localDate,
  money,
  orgId,
  stampedAt,
} from "./_base";
import { approvals, users } from "./auth-audit";
import { correctionDocuments } from "./corrections";
import {
  FOUR_EYES_STATUSES,
  PAYMENT_DIRECTIONS,
  PAYMENT_METHODS,
  REFUND_LIABILITY_SOURCES,
} from "./enums";
import { expenses } from "./expenses";
import { historicalObligations } from "./historical-migration";
import { customers, suppliers } from "./parties";
import { purchaseInvoices } from "./purchasing-imports";
import { taxInvoices } from "./sales-invoicing";

/** Immutable. Mistakes are corrected only by an approved payment reversal. */
export const payments = app.table(
  "payments",
  {
    id: id(),
    orgId: orgId(),
    direction: text("direction").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    method: text("method").notNull(),
    currency: currency(),
    amount: money("amount").notNull(),
    paymentDate: localDate("payment_date").notNull(),
    bankReference: text("bank_reference"),
    cashRuleCheck: jsonb("cash_rule_check"),
    accountantConfirmationRequired: boolean("accountant_confirmation_required")
      .notNull()
      .default(false),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
    recordedAt: stampedAt("recorded_at"),
  },
  (t) => [
    enumCheck("payments_direction_ck", t.direction, PAYMENT_DIRECTIONS),
    enumCheck("payments_method_ck", t.method, PAYMENT_METHODS),
    eurCheck("payments_currency_ck", t.currency),
    check("payments_amount_ck", sql`${t.amount} > 0`),
    check("payments_party_ck", sql`num_nonnulls(${t.customerId}, ${t.supplierId}) = 1`),
    index("payments_customer_idx").on(t.customerId),
    index("payments_supplier_idx").on(t.supplierId),
  ],
);

/** Exactly one target per allocation (CHECK). Σ limits are checked under the target's lock row. */
export const paymentAllocations = app.table(
  "payment_allocations",
  {
    id: id(),
    orgId: orgId(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    taxInvoiceId: uuid("tax_invoice_id").references(() => taxInvoices.id),
    correctionDocumentId: uuid("correction_document_id"),
    purchaseInvoiceId: uuid("purchase_invoice_id").references(() => purchaseInvoices.id),
    expenseId: uuid("expense_id").references(() => expenses.id),
    historicalObligationId: uuid("historical_obligation_id"),
    amount: money("amount").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    fk("payment_allocations_correction_fk", t.correctionDocumentId, correctionDocuments.id),
    fk("payment_allocations_historical_fk", t.historicalObligationId, historicalObligations.id),
    check(
      "payment_allocations_one_target_ck",
      sql`num_nonnulls(${t.taxInvoiceId}, ${t.correctionDocumentId}, ${t.purchaseInvoiceId}, ${t.expenseId}, ${t.historicalObligationId}) = 1`,
    ),
    check("payment_allocations_amount_ck", sql`${t.amount} > 0`),
    index("payment_allocations_payment_idx").on(t.paymentId),
    index("payment_allocations_invoice_idx").on(t.taxInvoiceId),
  ],
);

export const customerRefundLiabilities = app.table(
  "customer_refund_liabilities",
  {
    id: id(),
    orgId: orgId(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    currency: currency(),
    amount: money("amount").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("customer_refund_liabilities_source_uq").on(t.sourceType, t.sourceId),
    enumCheck("customer_refund_liabilities_source_ck", t.sourceType, REFUND_LIABILITY_SOURCES),
    eurCheck("customer_refund_liabilities_currency_ck", t.currency),
    check("customer_refund_liabilities_amount_ck", sql`${t.amount} > 0`),
  ],
);

export const refunds = app.table(
  "refunds",
  {
    id: id(),
    orgId: orgId(),
    liabilityId: uuid("liability_id")
      .notNull()
      .references(() => customerRefundLiabilities.id),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    amount: money("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("refunds_payment_uq").on(t.paymentId),
    check("refunds_amount_ck", sql`${t.amount} > 0`),
  ],
);

export const paymentReversals = app.table(
  "payment_reversals",
  {
    id: id(),
    orgId: orgId(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("PENDING_APPROVAL"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("payment_reversals_payment_uq").on(t.paymentId),
    enumCheck("payment_reversals_status_ck", t.status, FOUR_EYES_STATUSES),
    check("payment_reversals_reason_ck", sql`btrim(${t.reason}) <> ''`),
    check(
      "payment_reversals_approved_ck",
      sql`${t.status} <> 'APPROVED_POSTED' or ${t.approvalId} is not null`,
    ),
  ],
);
