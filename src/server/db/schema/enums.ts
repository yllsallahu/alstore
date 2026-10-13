export const ROLES = ["DIRECTOR", "ACCOUNTANT"] as const;
export const USER_STATUSES = ["INVITED", "ACTIVE", "DISABLED"] as const;
export const APPROVAL_DECISIONS = ["APPROVED", "REJECTED", "REVIEWED", "INVALIDATED"] as const;
export const IDEMPOTENCY_STATUSES = ["IN_PROGRESS", "COMPLETED"] as const;

export const GATE_STATUSES = [
  "NOT_STARTED",
  "EVIDENCE_PENDING",
  "APPROVED",
  "FAILED",
  "BLOCKED",
  "REVOKED",
] as const;
export const CUTOVER_STATUSES = ["DRAFT", "LOCKED", "EXECUTED"] as const;
export const INVOICE_ISSUERS = ["BOTH", "DIRECTOR_ONLY"] as const;
export const LEGAL_IDENTITY_STATUSES = ["PROPOSED", "APPROVED", "SUPERSEDED", "REJECTED"] as const;

export const SUPPLIER_COUNTRIES = ["XK", "AL"] as const;
export const VERIFICATION_METHODS = [
  "FORMAT_CHECK",
  "MANUAL_EVIDENCE",
  "OFFICIAL_SOURCE",
  "SUSPENSION",
  "REINSTATEMENT",
] as const;
export const VERIFICATION_RESULTS = ["PASSED", "FAILED"] as const;
/** Kosovo business identifiers a customer or Kosovo supplier may carry (labels only; OLD-14). */
export const KOSOVO_IDENTIFIER_TYPES = ["BUSINESS_NUMBER", "FISCAL_NUMBER", "VAT_NUMBER"] as const;
/** Identifier types per supplier country. Which are mandatory is not decided (OLD-14). */
export const SUPPLIER_IDENTIFIER_TYPES = {
  XK: KOSOVO_IDENTIFIER_TYPES,
  AL: ["NIPT"],
} as const;
export const FORMAT_RULE_STATUSES = ["ACTIVE", "RETIRED"] as const;

export const PRODUCT_CATEGORIES = ["ALUMINIUM", "PVC", "ACCESSORY", "OTHER"] as const;
export const UNITS = ["KG", "M2", "COPE"] as const;
export const UNIT_CHANGE_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED_APPLIED",
  "REJECTED",
  "CANCELLED",
] as const;
export const OPENING_BATCH_STATUSES = [
  "DRAFT",
  "COUNTED",
  "RECONCILED",
  "SIGNED_OFF",
  "POSTED",
] as const;
export const OPENING_LINE_STATUSES = ["VERIFIED_QTY", "VERIFIED_ZERO", "UNKNOWN"] as const;
export const MOVEMENT_TYPES = [
  "OPENING",
  "PURCHASE_RECEIPT",
  "SALE_FULFILLMENT",
  "FULFILLMENT_CORRECTION",
  "ADJUSTMENT",
] as const;
/** Movement type → the only source document type that may post it (INVENTORY_INVARIANTS §2). */
export const MOVEMENT_SOURCES = {
  OPENING: "OPENING_STOCK_BATCH",
  PURCHASE_RECEIPT: "GOODS_RECEIPT",
  SALE_FULFILLMENT: "FULFILLMENT",
  FULFILLMENT_CORRECTION: "FULFILLMENT_CORRECTION",
  ADJUSTMENT: "INVENTORY_ADJUSTMENT",
} as const;
export const ADJUSTMENT_KINDS = [
  "COUNT_CORRECTION",
  "DAMAGE_LOSS",
  "EXCEPTIONAL_RETURN",
  "OPENING_RESOLUTION",
] as const;
export const FOUR_EYES_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED_POSTED",
  "REJECTED",
] as const;

export const SALE_STATUSES = ["DRAFT", "CONFIRMED", "DISCARDED"] as const;
export const SERIES_KINDS = ["SALES_INVOICE", "CORRECTION_DOCUMENT"] as const;
export const SERIES_STATUSES = [
  "PROPOSED",
  "ACCOUNTANT_APPROVED",
  "ACTIVE",
  "CLOSED",
  "REJECTED",
] as const;

export const CORRECTION_KINDS = ["CREDIT", "DEBIT", "CORRECTION"] as const;
export const CORRECTION_REASONS = ["QTY_WRONG", "PRICE_WRONG", "BUYER_DATA", "OTHER"] as const;
export const CORRECTION_STATUSES = [
  "DRAFT",
  "PENDING_ACCOUNTANT_REVIEW",
  "ACCOUNTANT_APPROVED",
  "ISSUED",
  "DISCARDED",
] as const;

export const REGISTRATION_STATUSES = ["DRAFT", "REGISTERED"] as const;
export const TAX_CLASSIFICATION_STATUSES = [
  "UNCLASSIFIED",
  "PROPOSED",
  "ACCOUNTANT_APPROVED",
  "RECLASSIFICATION_PENDING",
] as const;
export const RECEIPT_STATUSES = ["DRAFT", "DISCREPANCY_HOLD", "POSTED", "REJECTED"] as const;

export const EXPENSE_CATEGORIES = [
  "RENT",
  "ELECTRICITY",
  "TRANSPORT",
  "SERVICES",
  "OTHER",
] as const;
export const EXPENSE_STATUSES = ["DRAFT", "POSTED"] as const;

export const PAYMENT_DIRECTIONS = ["IN", "OUT"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK"] as const;
export const REFUND_LIABILITY_SOURCES = ["PAYMENT_OVERPAYMENT", "CREDIT_AFTER_SETTLEMENT"] as const;
export const SETTLEMENT_TARGET_TYPES = [
  "TAX_INVOICE",
  "DEBIT_DOCUMENT",
  "PURCHASE_INVOICE",
  "EXPENSE",
  "HISTORICAL_OBLIGATION",
  "REFUND_LIABILITY",
] as const;

export const IMPORT_BATCH_KINDS = [
  "PRODUCTS",
  "OPENING_STOCK",
  "HISTORICAL_RECEIVABLES",
  "HISTORICAL_PAYABLES",
] as const;
export const IMPORT_BATCH_STATUSES = [
  "UPLOADED",
  "VALIDATED",
  "HAS_ERRORS",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
] as const;
export const OBLIGATION_DIRECTIONS = ["RECEIVABLE", "PAYABLE"] as const;
export const OBLIGATION_STATUSES = ["STAGED", "APPROVED", "REJECTED"] as const;

export const VAT_RULE_STATUSES = ["DRAFT", "ACCOUNTANT_APPROVED", "ACTIVE", "SUPERSEDED"] as const;
export const VAT_APPLIES_TO = ["SALE", "PURCHASE", "IMPORT", "EXPENSE"] as const;
export const TAX_PERIOD_STATUSES = [
  "OPEN",
  "READY_FOR_ACCOUNTANT_REVIEW",
  "ACCOUNTANT_REVIEWED",
  "DIRECTOR_APPROVED",
  "CLOSED",
  "AMENDMENT_OPEN",
] as const;
export const PERIOD_SNAPSHOT_KINDS = [
  "READY",
  "ACCOUNTANT_REVIEW",
  "DIRECTOR_APPROVAL",
  "CLOSE",
  "AMENDMENT",
] as const;
export const BOOKS = ["LB", "LSH"] as const;
/** Whitelist of book-line sources: historical obligations, payments, stock and PDFs are never sources. */
export const BOOK_SOURCES = [
  "TAX_INVOICE",
  "CORRECTION_DOCUMENT",
  "PURCHASE_INVOICE",
  "IMPORT_DECLARATION",
  "EXPENSE",
] as const;
export const EXPORT_KINDS = ["INTERNAL_PREVIEW", "OFFICIAL"] as const;

export const DOCUMENT_FILE_STATUSES = ["QUARANTINE", "LINKED", "ORPHANED"] as const;
export const DOCUMENT_ROLES = [
  "SUPPLIER_INVOICE",
  "DUD",
  "VERIFICATION_EVIDENCE",
  "COUNT_SHEET",
  "EXPENSE_EVIDENCE",
  "FILING_RECEIPT",
  "ADJUSTMENT_EVIDENCE",
  "OTHER",
] as const;
