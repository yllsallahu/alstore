import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  text,
  unique,
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
  sha256Check,
  stampedAt,
} from "./_base";
import { approvals, users } from "./auth-audit";
import { documentFiles } from "./documents";
import {
  BOOK_SOURCES,
  BOOKS,
  EXPORT_KINDS,
  PERIOD_SNAPSHOT_KINDS,
  TAX_PERIOD_STATUSES,
  VAT_APPLIES_TO,
  VAT_RULE_STATUSES,
} from "./enums";

/** No rate or treatment is seeded by developers; all values are entered and approved by the accountant (VG-02). */
export const vatRuleSets = app.table(
  "vat_rule_sets",
  {
    id: id(),
    orgId: orgId(),
    name: text("name").notNull(),
    status: text("status").notNull().default("DRAFT"),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("vat_rule_sets_status_ck", t.status, VAT_RULE_STATUSES),
    check("vat_rule_sets_approved_ck", sql`${t.status} = 'DRAFT' or ${t.approvalId} is not null`),
  ],
);

/** Overlap of effective ranges per (category, scope) is prevented by an exclusion constraint (migration 0001). */
export const vatRules = app.table(
  "vat_rules",
  {
    id: id(),
    orgId: orgId(),
    ruleSetId: uuid("rule_set_id")
      .notNull()
      .references(() => vatRuleSets.id),
    categoryCode: text("category_code").notNull(),
    appliesTo: text("applies_to").notNull(),
    rate: numeric("rate", { precision: 9, scale: 4 }),
    treatment: text("treatment").notNull(),
    effectiveFrom: localDate("effective_from").notNull(),
    effectiveTo: localDate("effective_to"),
    status: text("status").notNull().default("DRAFT"),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("vat_rules_applies_to_ck", t.appliesTo, VAT_APPLIES_TO),
    enumCheck("vat_rules_status_ck", t.status, VAT_RULE_STATUSES),
    check("vat_rules_rate_ck", sql`${t.rate} is null or ${t.rate} >= 0`),
    check(
      "vat_rules_range_ck",
      sql`${t.effectiveTo} is null or ${t.effectiveTo} > ${t.effectiveFrom}`,
    ),
  ],
);

/** Immutable record of the rules and rounding policy applied to one posted document. */
export const taxSnapshots = app.table(
  "tax_snapshots",
  {
    id: id(),
    orgId: orgId(),
    ruleIds: uuid("rule_ids").array().notNull(),
    ruleValues: jsonb("rule_values").notNull(),
    roundingPolicyVersion: text("rounding_policy_version").notNull(),
    computationTrace: jsonb("computation_trace").notNull(),
    hash: text("hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [sha256Check("tax_snapshots_hash_ck", t.hash)],
);

export const taxPeriods = app.table(
  "tax_periods",
  {
    id: id(),
    orgId: orgId(),
    periodMonth: localDate("period_month").notNull(),
    status: text("status").notNull().default("OPEN"),
    currentSnapshotId: uuid("current_snapshot_id").references(
      (): AnyPgColumn => taxPeriodSnapshots.id,
    ),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    unique("tax_periods_month_uq").on(t.orgId, t.periodMonth),
    enumCheck("tax_periods_status_ck", t.status, TAX_PERIOD_STATUSES),
    check(
      "tax_periods_first_day_ck",
      sql`${t.periodMonth} = date_trunc('month', ${t.periodMonth})::date`,
    ),
  ],
);

export const taxPeriodSnapshots = app.table(
  "tax_period_snapshots",
  {
    id: id(),
    orgId: orgId(),
    periodId: uuid("period_id")
      .notNull()
      .references((): AnyPgColumn => taxPeriods.id),
    kind: text("kind").notNull(),
    contentHash: text("content_hash").notNull(),
    totals: jsonb("totals").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    enumCheck("tax_period_snapshots_kind_ck", t.kind, PERIOD_SNAPSHOT_KINDS),
    sha256Check("tax_period_snapshots_hash_ck", t.contentHash),
  ],
);

/** LB/LSH projection. Source whitelist excludes historical obligations, payments, stock and PDFs. */
export const bookLines = app.table(
  "book_lines",
  {
    id: id(),
    orgId: orgId(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => taxPeriods.id),
    book: text("book").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    lineVersion: integer("line_version").notNull().default(1),
    data: jsonb("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("book_lines_source_uq").on(t.book, t.sourceType, t.sourceId, t.lineVersion),
    enumCheck("book_lines_book_ck", t.book, BOOKS),
    enumCheck("book_lines_source_ck", t.sourceType, BOOK_SOURCES),
    check(
      "book_lines_book_source_ck",
      sql`(${t.book} = 'LSH' and ${t.sourceType} in ('TAX_INVOICE', 'CORRECTION_DOCUMENT'))
        or (${t.book} = 'LB' and ${t.sourceType} in ('PURCHASE_INVOICE', 'IMPORT_DECLARATION', 'EXPENSE', 'CORRECTION_DOCUMENT'))`,
    ),
  ],
);

export const atkTemplateProvenance = app.table(
  "atk_template_provenance",
  {
    id: id(),
    orgId: orgId(),
    url: text("url").notNull(),
    retrievedAt: instant("retrieved_at").notNull(),
    fileSha256: text("file_sha256").notNull(),
    versionLabel: text("version_label").notNull(),
    mappingDoc: text("mapping_doc").notNull(),
    approvalId: uuid("approval_id").references(() => approvals.id),
    createdAt: createdAt(),
  },
  (t) => [sha256Check("atk_template_provenance_sha_ck", t.fileSha256)],
);

/** OFFICIAL exports additionally require VG-12 APPROVED and a DIRECTOR_APPROVED period (service check). */
export const exports = app.table(
  "exports",
  {
    id: id(),
    orgId: orgId(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => taxPeriods.id),
    kind: text("kind").notNull(),
    periodSnapshotHash: text("period_snapshot_hash").notNull(),
    templateProvenanceId: uuid("template_provenance_id").references(() => atkTemplateProvenance.id),
    fileSha256: text("file_sha256").notNull(),
    generatedBy: uuid("generated_by")
      .notNull()
      .references(() => users.id),
    generatedAt: stampedAt("generated_at"),
  },
  (t) => [
    enumCheck("exports_kind_ck", t.kind, EXPORT_KINDS),
    check(
      "exports_official_ck",
      sql`${t.kind} = 'INTERNAL_PREVIEW' or ${t.templateProvenanceId} is not null`,
    ),
    sha256Check("exports_sha_ck", t.fileSha256),
  ],
);

/** Manual record of a filing the owner did outside the app; the app never logs into ATK. */
export const ediFilingReceipts = app.table(
  "edi_filing_receipts",
  {
    id: id(),
    orgId: orgId(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => taxPeriods.id),
    filingKind: text("filing_kind").notNull(),
    filedOn: localDate("filed_on").notNull(),
    receiptReference: text("receipt_reference").notNull(),
    evidenceDocumentId: uuid("evidence_document_id")
      .notNull()
      .references(() => documentFiles.id),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [unique("edi_filing_receipts_uq").on(t.periodId, t.filingKind)],
);
