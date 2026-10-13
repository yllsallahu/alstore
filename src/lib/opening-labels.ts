/** Albanian labels for import / opening-stock / cutover codes. Codes stay English in the database. */

export const IMPORT_STATUS_LABELS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" }
> = {
  UPLOADED: { label: "Ngarkuar", tone: "neutral" },
  VALIDATED: { label: "Pa gabime — pret miratimin", tone: "info" },
  HAS_ERRORS: { label: "Ka gabime", tone: "danger" },
  PENDING_APPROVAL: { label: "Pret miratimin", tone: "info" },
  APPROVED: { label: "Miratuar", tone: "success" },
  REJECTED: { label: "Refuzuar", tone: "neutral" },
};

export const IMPORT_KIND_LABELS: Record<string, string> = {
  PRODUCTS: "Import produktesh",
  OPENING_STOCK: "Fleta e numërimit fizik",
};

export const ROW_STATUS_LABELS = {
  VALID: { label: "Në rregull", tone: "success" },
  WARNING: { label: "Paralajmërim", tone: "warn" },
  ERROR: { label: "Gabim", tone: "danger" },
} as const;

export const OPENING_STATUS_LABELS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "warn" | "success" }
> = {
  DRAFT: { label: "Në hartim", tone: "neutral" },
  COUNTED: { label: "Numërimi përfundoi", tone: "info" },
  RECONCILED: { label: "Rakordimi u bë", tone: "info" },
  SIGNED_OFF: { label: "Nënshkruar", tone: "success" },
  POSTED: { label: "Regjistruar në stok", tone: "success" },
};

export const OPENING_LINE_LABELS: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warn" }
> = {
  VERIFIED_QTY: { label: "Sasi e verifikuar", tone: "success" },
  VERIFIED_ZERO: { label: "Zero e verifikuar", tone: "success" },
  UNKNOWN: { label: "E panjohur", tone: "warn" },
};

export const CUTOVER_STATUS_LABELS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" }
> = {
  DRAFT: { label: "Në hartim", tone: "neutral" },
  LOCKED: { label: "I mbyllur", tone: "info" },
  EXECUTED: { label: "I zbatuar", tone: "success" },
};

export const SERIES_STATUS_LABELS: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "warn" }
> = {
  PROPOSED: { label: "Propozuar — pret kontabilistin", tone: "warn" },
  ACCOUNTANT_APPROVED: { label: "Miratuar nga kontabilisti", tone: "info" },
  ACTIVE: { label: "Aktive", tone: "success" },
  CLOSED: { label: "Mbyllur", tone: "neutral" },
  REJECTED: { label: "Refuzuar", tone: "neutral" },
};
