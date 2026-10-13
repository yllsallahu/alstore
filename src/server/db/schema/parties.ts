import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

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
  orgId,
  sha256Check,
  stampedAt,
  updatedAt,
  version,
} from "./_base";
import { users } from "./auth-audit";
import { documentFiles } from "./documents";
import {
  FORMAT_RULE_STATUSES,
  KOSOVO_IDENTIFIER_TYPES,
  SUPPLIER_COUNTRIES,
  VERIFICATION_METHODS,
  VERIFICATION_RESULTS,
} from "./enums";

const textLength = (column: AnyPgColumn, max: number) =>
  sql`${column} is null or (btrim(${column}) <> '' and char_length(${column}) <= ${sql.raw(String(max))})`;

/**
 * Registered businesses only. Identifier keys are KOSOVO_IDENTIFIER_TYPES; which are mandatory and
 * their formats depend on OLD-14 and are configured by the accountant (identifier_format_rules).
 */
export const customers = app.table(
  "customers",
  {
    id: id(),
    orgId: orgId(),
    legalName: text("legal_name").notNull(),
    identifiers: jsonb("identifiers").notNull().default({}),
    /** Billing address (street and number). */
    address: text("address"),
    city: text("city"),
    active: boolean("active").notNull().default(true),
    relatedSupplierId: uuid("related_supplier_id").references((): AnyPgColumn => suppliers.id),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "customers_legal_name_ck",
      sql`btrim(${t.legalName}) <> '' and char_length(${t.legalName}) <= 200`,
    ),
    check("customers_identifiers_ck", sql`jsonb_typeof(${t.identifiers}) = 'object'`),
    check("customers_address_ck", textLength(t.address, 300)),
    check("customers_city_ck", textLength(t.city, 100)),
  ],
);

/** Append-only verification history; the customer's verification state is derived from it, never stored. */
export const customerVerifications = app.table(
  "customer_verifications",
  {
    id: id(),
    orgId: orgId(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    method: text("method").notNull(),
    result: text("result").notNull(),
    evidenceDocumentId: uuid("evidence_document_id"),
    note: text("note"),
    /** sha256 of the legal name + identifiers verified; a later identity edit makes this row stale. */
    identityHash: text("identity_hash").notNull(),
    verifiedBy: uuid("verified_by")
      .notNull()
      .references(() => users.id),
    verifiedAt: stampedAt("verified_at"),
    validUntil: localDate("valid_until"),
  },
  (t) => [
    fk("customer_verifications_evidence_fk", t.evidenceDocumentId, documentFiles.id),
    enumCheck("customer_verifications_method_ck", t.method, VERIFICATION_METHODS),
    enumCheck("customer_verifications_result_ck", t.result, VERIFICATION_RESULTS),
    check(
      "customer_verifications_evidence_ck",
      sql`${t.method} <> 'MANUAL_EVIDENCE' or ${t.evidenceDocumentId} is not null`,
    ),
    sha256Check("customer_verifications_identity_hash_ck", t.identityHash),
    // No trusted registry integration exists: an "officially verified" claim is impossible.
    check("customer_verifications_no_official_ck", sql`${t.method} <> 'OFFICIAL_SOURCE'`),
    check(
      "customer_verifications_note_ck",
      sql`${t.method} not in ('MANUAL_EVIDENCE', 'SUSPENSION', 'REINSTATEMENT')
        or (${t.note} is not null and btrim(${t.note}) <> '')`,
    ),
    index("customer_verifications_customer_idx").on(t.customerId, t.verifiedAt),
  ],
);

/**
 * Accountant-defined identifier format and requirement rules (OLD-14, P-15). Without an ACTIVE
 * rule for an identifier type, no format validation is claimed for it.
 */
export const identifierFormatRules = app.table(
  "identifier_format_rules",
  {
    id: id(),
    orgId: orgId(),
    identifierType: text("identifier_type").notNull(),
    required: boolean("required").notNull().default(false),
    digitsOnly: boolean("digits_only").notNull().default(true),
    minLength: integer("min_length").notNull(),
    maxLength: integer("max_length").notNull(),
    sourceNote: text("source_note").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    retiredBy: uuid("retired_by").references(() => users.id),
    retiredAt: instant("retired_at"),
  },
  (t) => [
    enumCheck("identifier_format_rules_type_ck", t.identifierType, KOSOVO_IDENTIFIER_TYPES),
    enumCheck("identifier_format_rules_status_ck", t.status, FORMAT_RULE_STATUSES),
    check(
      "identifier_format_rules_length_ck",
      sql`${t.minLength} >= 1 and ${t.maxLength} >= ${t.minLength} and ${t.maxLength} <= 40`,
    ),
    check(
      "identifier_format_rules_source_ck",
      sql`btrim(${t.sourceNote}) <> '' and char_length(${t.sourceNote}) <= 500`,
    ),
    check(
      "identifier_format_rules_retired_ck",
      sql`(${t.status} = 'RETIRED') = (${t.retiredBy} is not null and ${t.retiredAt} is not null)`,
    ),
    uniqueIndex("identifier_format_rules_one_active_uq")
      .on(t.orgId, t.identifierType)
      .where(sql`${t.status} = 'ACTIVE'`),
  ],
);

export const suppliers = app.table(
  "suppliers",
  {
    id: id(),
    orgId: orgId(),
    legalName: text("legal_name").notNull(),
    country: text("country").notNull(),
    identifiers: jsonb("identifiers").notNull().default({}),
    currency: currency(),
    address: text("address"),
    city: text("city"),
    /** How this supplier numbers/references its invoices (helps matching in Phase 10). */
    invoiceReferenceNote: text("invoice_reference_note"),
    active: boolean("active").notNull().default(true),
    relatedCustomerId: uuid("related_customer_id").references((): AnyPgColumn => customers.id),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    enumCheck("suppliers_country_ck", t.country, SUPPLIER_COUNTRIES),
    eurCheck("suppliers_currency_ck", t.currency),
    check(
      "suppliers_legal_name_ck",
      sql`btrim(${t.legalName}) <> '' and char_length(${t.legalName}) <= 200`,
    ),
    check("suppliers_identifiers_ck", sql`jsonb_typeof(${t.identifiers}) = 'object'`),
    check("suppliers_address_ck", textLength(t.address, 300)),
    check("suppliers_city_ck", textLength(t.city, 100)),
    check("suppliers_invoice_reference_ck", textLength(t.invoiceReferenceNote, 300)),
  ],
);
