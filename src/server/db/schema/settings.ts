import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  app,
  createdAt,
  enumCheck,
  id,
  instant,
  localDate,
  orgId,
  organizations,
  updatedAt,
  version,
} from "./_base";
import { users } from "./auth-audit";
import { CUTOVER_STATUSES, GATE_STATUSES, INVOICE_ISSUERS, LEGAL_IDENTITY_STATUSES } from "./enums";

/** Seller legal identity (OLD-01 fields, entered by the owner). Versioned, never overwritten (P-03). */
export const orgLegalIdentityVersions = app.table(
  "org_legal_identity_versions",
  {
    id: id(),
    orgId: orgId(),
    versionNo: integer("version_no").notNull(),
    identity: jsonb("identity").notNull(),
    status: text("status").notNull().default("PROPOSED"),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("org_legal_identity_versions_uq").on(t.orgId, t.versionNo),
    enumCheck("org_legal_identity_versions_status_ck", t.status, LEGAL_IDENTITY_STATUSES),
    check(
      "org_legal_identity_versions_four_eyes_ck",
      sql`${t.approvedBy} is null or ${t.approvedBy} <> ${t.proposedBy}`,
    ),
    uniqueIndex("org_legal_identity_versions_one_approved_uq")
      .on(t.orgId)
      .where(sql`${t.status} = 'APPROVED'`),
  ],
);

export const orgSettings = app.table(
  "org_settings",
  {
    orgId: uuid("org_id")
      .primaryKey()
      .references(() => organizations.id),
    defaultPaymentTermDays: integer("default_payment_term_days").notNull().default(15),
    invoiceIssuers: text("invoice_issuers").notNull().default("BOTH"),
    cashRuleRef: text("cash_rule_ref"),
    timezone: text("timezone").notNull().default("Europe/Belgrade"),
    version: version(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("org_settings_payment_term_ck", sql`${t.defaultPaymentTermDays} > 0`),
    enumCheck("org_settings_invoice_issuers_ck", t.invoiceIssuers, INVOICE_ISSUERS),
    check("org_settings_timezone_ck", sql`${t.timezone} = 'Europe/Belgrade'`),
  ],
);

export const releaseGates = app.table(
  "release_gates",
  {
    id: id(),
    orgId: orgId(),
    gateKey: text("gate_key").notNull(),
    status: text("status").notNull().default("NOT_STARTED"),
    evidenceDocumentIds: uuid("evidence_document_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: instant("approved_at"),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("release_gates_key_uq").on(t.orgId, t.gateKey),
    check("release_gates_key_ck", sql`${t.gateKey} ~ '^(VG|RG)-[0-9]{2}$'`),
    enumCheck("release_gates_status_ck", t.status, GATE_STATUSES),
    check(
      "release_gates_approved_ck",
      sql`(${t.status} = 'APPROVED') = (${t.approvedBy} is not null and ${t.approvedAt} is not null)`,
    ),
  ],
);

/**
 * The cutover plan: intended start date (D, first of a month preferred), the final Excel workday
 * the opening stock is reconciled to, and the named cutover instant (D 00:00 Europe/Belgrade).
 * DRAFT is editable; LOCKED when the opening stock is signed off; EXECUTED in Phase 20.
 */
export const cutoverPlans = app.table(
  "cutover_plans",
  {
    id: id(),
    orgId: orgId(),
    plannedCutoverDate: localDate("planned_cutover_date").notNull(),
    lastExcelDay: localDate("last_excel_day").notNull(),
    cutoverInstant: instant("cutover_instant"),
    status: text("status").notNull().default("DRAFT"),
    signedBy: uuid("signed_by").references(() => users.id),
    signedAt: instant("signed_at"),
    createdAt: createdAt(),
    createdBy: uuid("created_by").references(() => users.id),
    /** A start date that is not the first of a month needs the accountant's period approach (OLD-19). */
    midMonthAcknowledged: boolean("mid_month_acknowledged").notNull().default(false),
    version: version(),
    updatedAt: updatedAt(),
  },
  (t) => [
    enumCheck("cutover_plans_status_ck", t.status, CUTOVER_STATUSES),
    check("cutover_plans_dates_ck", sql`${t.lastExcelDay} < ${t.plannedCutoverDate}`),
    check(
      "cutover_plans_instant_ck",
      sql`${t.cutoverInstant} is null
        or ${t.cutoverInstant} = (${t.plannedCutoverDate}::timestamp at time zone 'Europe/Belgrade')`,
    ),
    check(
      "cutover_plans_mid_month_ck",
      sql`${t.midMonthAcknowledged} or extract(day from ${t.plannedCutoverDate}) = 1`,
    ),
    uniqueIndex("cutover_plans_one_active_uq")
      .on(t.orgId)
      .where(sql`${t.status} in ('DRAFT', 'LOCKED')`),
  ],
);
