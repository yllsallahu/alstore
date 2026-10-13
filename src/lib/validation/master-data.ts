import { z } from "zod";

import { DECIMAL_MESSAGES, parseDecimal } from "@/lib/decimal";
import {
  KOSOVO_IDENTIFIER_TYPES,
  PRODUCT_CATEGORIES,
  SUPPLIER_COUNTRIES,
  SUPPLIER_IDENTIFIER_TYPES,
  UNITS,
} from "@/server/db/schema/enums";

/** Server-authoritative validation with Albanian messages; field paths match the form names. */

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

const requiredText = (label: string, max: number, min = 1) =>
  z
    .string({ error: `Shkruani ${label}.` })
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(min, { error: min > 1 ? `Shkruani të paktën ${min} shenja.` : `Shkruani ${label}.` })
        .max(max, { error: `Lejohen deri në ${max} shenja.` }),
    );

/** Empty → null; otherwise trimmed and length-limited. */
const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) =>
      typeof value === "string" && collapse(value) !== "" ? collapse(value) : null,
    )
    .pipe(
      z
        .string()
        .max(max, { error: `Lejohen deri në ${max} shenja.` })
        .nullable(),
    );

const flag = z
  .union([z.boolean(), z.enum(["true", "false", "on"])])
  .transform((v) => v === true || v === "true" || v === "on");

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9./_-]{0,39}$/;

export const skuSchema = z
  .string({ error: "Shkruani SKU-në." })
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(1, { error: "Shkruani SKU-në." })
      .max(40, { error: "SKU mund të ketë deri në 40 shenja." })
      .regex(SKU_PATTERN, {
        error: "SKU lejon vetëm shkronja latine, shifra dhe . / _ - (pa hapësira, pa ë/ç).",
      }),
  );

const barcodeSchema = z
  .string()
  .nullish()
  .transform((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z.string().regex(/^[A-Z0-9-]{4,64}$/, {
        error: "Barkodi lejon 4–64 shifra, shkronja latine ose vizë.",
      }),
    ]),
  );

/** Optional 3-dp, non-negative price before VAT. Canonical "12.500" or null. */
export const optionalPrice3 = z
  .string()
  .nullish()
  .transform((value, ctx) => {
    if (typeof value !== "string" || value.trim() === "") return null;
    const parsed = parseDecimal(value, { scale: 3 });
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: DECIMAL_MESSAGES[parsed.error](3) });
      return z.NEVER;
    }
    return parsed.value;
  });

const categorySchema = z.enum(PRODUCT_CATEGORIES, { error: "Zgjidhni kategorinë." });
const unitSchema = z.enum(UNITS, { error: "Zgjidhni njësinë: kg, m² ose copë." });

const acknowledged = z.array(z.uuid()).max(50).default([]);

export const productCreateSchema = z.object({
  sku: skuSchema,
  name: requiredText("emrin e produktit", 200),
  category: categorySchema,
  unit: unitSchema,
  barcode: barcodeSchema,
  referencePurchasePrice: optionalPrice3,
  active: flag.default(true),
  acknowledgedDuplicateIds: acknowledged,
});

/** SKU is not part of an update; the service rejects any payload that carries one. */
export const productUpdateSchema = z.object({
  productId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  name: requiredText("emrin e produktit", 200),
  category: categorySchema,
  unit: unitSchema,
  barcode: barcodeSchema,
  referencePurchasePrice: optionalPrice3,
  active: flag,
  acknowledgedDuplicateIds: acknowledged,
});

export const unitChangeRequestSchema = z.object({
  productId: z.uuid(),
  toUnit: unitSchema,
  reason: requiredText("arsyen", 500, 10),
});

export const unitChangeDecisionSchema = z.object({
  changeId: z.uuid(),
  decision: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  comment: optionalText(500),
});

/** Identifier value: spaces removed, upper case, no punctuation besides "-". */
const identifierValue = z
  .string()
  .nullish()
  .transform((value) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : ""))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z.string().regex(/^[A-Z0-9-]{1,40}$/, {
        error: "Lejohen vetëm shifra, shkronja latine dhe vizë (deri 40).",
      }),
    ]),
  );

const kosovoIdentifiers = z.object(
  Object.fromEntries(KOSOVO_IDENTIFIER_TYPES.map((type) => [type, identifierValue])) as Record<
    (typeof KOSOVO_IDENTIFIER_TYPES)[number],
    typeof identifierValue
  >,
);

export type IdentifierMap = Partial<Record<string, string>>;

/** Drops null members so the stored JSON only holds identifiers that were entered. */
export const compactIdentifiers = (value: Record<string, string | null>): IdentifierMap =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null)) as IdentifierMap;

export const NO_IDENTIFIER_MESSAGE =
  "Një klient biznes duhet të ketë të paktën një numër identifikues të biznesit.";

const customerFields = {
  legalName: requiredText("emrin ligjor të biznesit", 200, 2),
  identifiers: kosovoIdentifiers,
  address: optionalText(300),
  city: optionalText(100),
  active: flag.default(true),
  acknowledgedDuplicateIds: acknowledged,
};

const requireOneIdentifier = (
  data: { identifiers: Record<string, string | null> },
  ctx: z.RefinementCtx,
) => {
  if (!Object.values(data.identifiers).some((value) => value !== null)) {
    ctx.addIssue({ code: "custom", path: ["identifiers"], message: NO_IDENTIFIER_MESSAGE });
  }
};

export const customerCreateSchema = z.object(customerFields).superRefine(requireOneIdentifier);

export const customerUpdateSchema = z
  .object({
    customerId: z.uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    ...customerFields,
    active: flag,
  })
  .superRefine(requireOneIdentifier);

const supplierIdentifierValues = z.record(z.string(), identifierValue);

const supplierFields = {
  legalName: requiredText("emrin ligjor të furnitorit", 200, 2),
  country: z.enum(SUPPLIER_COUNTRIES, { error: "Zgjidhni shtetin: Kosovë ose Shqipëri." }),
  identifiers: supplierIdentifierValues,
  address: optionalText(300),
  city: optionalText(100),
  invoiceReferenceNote: optionalText(300),
  active: flag.default(true),
  acknowledgedDuplicateIds: acknowledged,
};

const supplierIdentifierCheck = (
  data: {
    country: (typeof SUPPLIER_COUNTRIES)[number];
    identifiers: Record<string, string | null>;
  },
  ctx: z.RefinementCtx,
) => {
  const allowed: readonly string[] = SUPPLIER_IDENTIFIER_TYPES[data.country];
  for (const [key, value] of Object.entries(data.identifiers)) {
    if (value !== null && !allowed.includes(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["identifiers", key],
        message: "Ky numër nuk vlen për shtetin e zgjedhur.",
      });
    }
  }
  if (!allowed.some((key) => data.identifiers[key])) {
    ctx.addIssue({
      code: "custom",
      path: ["identifiers"],
      message: "Shkruani të paktën një numër identifikues të furnitorit.",
    });
  }
};

export const supplierCreateSchema = z.object(supplierFields).superRefine(supplierIdentifierCheck);

export const supplierUpdateSchema = z
  .object({
    supplierId: z.uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    ...supplierFields,
    active: flag,
  })
  .superRefine(supplierIdentifierCheck);

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const manualVerificationSchema = z.object({
  customerId: z.uuid(),
  result: z.enum(["PASSED", "FAILED"], { error: "Zgjidhni rezultatin e kontrollit." }),
  evidenceDocumentId: z.uuid({ error: "Bashkëngjitni dokumentin e regjistrimit si dëshmi." }),
  note: requiredText("çfarë u kontrollua", 500, 10),
  validUntil: z
    .string()
    .nullish()
    .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null))
    .pipe(z.string().regex(isoDate, { error: "Data duhet të jetë VVVV-MM-DD." }).nullable()),
});

export const suspensionSchema = z.object({
  customerId: z.uuid(),
  reason: requiredText("arsyen", 500, 10),
});

export const formatRuleSchema = z
  .object({
    identifierType: z.enum(KOSOVO_IDENTIFIER_TYPES, { error: "Zgjidhni llojin e numrit." }),
    required: flag.default(false),
    digitsOnly: flag.default(true),
    minLength: z.coerce
      .number({ error: "Shkruani gjatësinë minimale." })
      .int({ error: "Shkruani një numër të plotë." })
      .min(1, { error: "Gjatësia minimale është 1." })
      .max(40, { error: "Gjatësia maksimale është 40." }),
    maxLength: z.coerce
      .number({ error: "Shkruani gjatësinë maksimale." })
      .int({ error: "Shkruani një numër të plotë." })
      .min(1, { error: "Gjatësia minimale është 1." })
      .max(40, { error: "Gjatësia maksimale është 40." }),
    sourceNote: requiredText("burimin e rregullit", 500, 10),
  })
  .refine((rule) => rule.maxLength >= rule.minLength, {
    path: ["maxLength"],
    error: "Gjatësia maksimale duhet të jetë sa ose më e madhe se minimalja.",
  });

export const searchSchema = z.object({
  q: z
    .string()
    .default("")
    .transform(collapse)
    .pipe(z.string().max(80, { error: "Kërkimi lejon deri në 80 shenja." })),
  includeInactive: flag.default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type FieldErrors = Record<string, string>;

/** First message per dotted field path ("identifiers.FISCAL_NUMBER"). */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    out[key] ??= issue.message;
  }
  return out;
}
