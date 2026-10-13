import { sql } from "drizzle-orm";
import { check, text, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

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
} from "./_base";
import { users } from "./auth-audit";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, TAX_CLASSIFICATION_STATUSES } from "./enums";
import { suppliers } from "./parties";

/** Non-stock business costs. No FK path to inventory exists by design (INV-17). */
export const expenses = app.table(
  "expenses",
  {
    id: id(),
    orgId: orgId(),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    vendorName: text("vendor_name"),
    reference: text("reference").notNull(),
    normalizedReference: text("normalized_reference").notNull(),
    documentDate: localDate("document_date").notNull(),
    category: text("category").notNull(),
    currency: currency(),
    netAmount: money("net_amount").notNull(),
    vatAmount: money("vat_amount").notNull(),
    grossAmount: money("gross_amount").notNull(),
    taxClassificationStatus: text("tax_classification_status").notNull().default("UNCLASSIFIED"),
    status: text("status").notNull().default("DRAFT"),
    correctsExpenseId: uuid("corrects_expense_id").references((): AnyPgColumn => expenses.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    postedAt: instant("posted_at"),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "expenses_vendor_ck",
      sql`num_nonnulls(${t.supplierId}, nullif(btrim(coalesce(${t.vendorName}, '')), '')) = 1`,
    ),
    enumCheck("expenses_category_ck", t.category, EXPENSE_CATEGORIES),
    enumCheck("expenses_status_ck", t.status, EXPENSE_STATUSES),
    enumCheck("expenses_tax_ck", t.taxClassificationStatus, TAX_CLASSIFICATION_STATUSES),
    eurCheck("expenses_currency_ck", t.currency),
    check("expenses_totals_ck", sql`${t.grossAmount} = ${t.netAmount} + ${t.vatAmount}`),
    check("expenses_posted_ck", sql`(${t.status} = 'POSTED') = (${t.postedAt} is not null)`),
    uniqueIndex("expenses_supplier_reference_uq")
      .on(t.supplierId, t.normalizedReference)
      .where(sql`${t.supplierId} is not null and ${t.correctsExpenseId} is null`),
    uniqueIndex("expenses_vendor_reference_uq")
      .on(t.orgId, sql`lower(${t.vendorName})`, t.normalizedReference)
      .where(sql`${t.supplierId} is null and ${t.correctsExpenseId} is null`),
  ],
);
