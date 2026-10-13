/** Albanian labels for master-data codes. Codes stay English in the database. */

export const UNIT_LABELS = { KG: "kg", M2: "m²", COPE: "copë" } as const;

export const CATEGORY_LABELS = {
  ALUMINIUM: "Alumin",
  PVC: "PVC",
  ACCESSORY: "Aksesorë",
  OTHER: "Tjetër",
} as const;

export const COUNTRY_LABELS = { XK: "Kosovë", AL: "Shqipëri" } as const;

export const IDENTIFIER_LABELS = {
  BUSINESS_NUMBER: "Numri unik identifikues i biznesit (NUI)",
  FISCAL_NUMBER: "Numri fiskal",
  VAT_NUMBER: "Numri i TVSH-së",
  NIPT: "NIPT / NUIS",
} as const;

export const IDENTIFIER_SHORT_LABELS = {
  BUSINESS_NUMBER: "NUI",
  FISCAL_NUMBER: "Nr. fiskal",
  VAT_NUMBER: "Nr. TVSH",
  NIPT: "NIPT",
} as const;

export type VerificationState =
  "UNVERIFIED" | "FORMAT_VALID" | "MANUALLY_VERIFIED" | "OFFICIALLY_VERIFIED" | "SUSPENDED";

/** Exact wording matters: format validity is never presented as a registry check. */
export const VERIFICATION_LABELS: Record<VerificationState, { label: string; hint: string }> = {
  UNVERIFIED: {
    label: "I paverifikuar",
    hint: "Asnjë kontroll i vlefshëm për identitetin aktual të biznesit.",
  },
  FORMAT_VALID: {
    label: "Formati i vlefshëm",
    hint: "Numrat kanë formatin e miratuar nga kontabilisti. Nuk është kontroll në regjistrin zyrtar dhe nuk lejon faturimin.",
  },
  MANUALLY_VERIFIED: {
    label: "I verifikuar manualisht",
    hint: "Një përdorues ka kontrolluar dokumentin e regjistrimit dhe e ka ruajtur si dëshmi.",
  },
  OFFICIALLY_VERIFIED: {
    label: "I verifikuar zyrtarisht",
    hint: "Nuk përdoret: nuk ekziston asnjë lidhje e besueshme me regjistrin zyrtar.",
  },
  SUSPENDED: {
    label: "I pezulluar",
    hint: "Verifikimi është pezulluar. Klienti nuk mund të faturohet.",
  },
};

export const UNIT_CHANGE_STATUS_LABELS = {
  PENDING_APPROVAL: "Në pritje të miratimit",
  APPROVED_APPLIED: "E miratuar dhe e zbatuar",
  REJECTED: "E refuzuar",
  CANCELLED: "E anuluar",
} as const;
