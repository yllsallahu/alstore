/**
 * Import fields, header suggestions and mapping validation. A mapping is `{ field: columnIndex }`;
 * every column is matched by position, never by guessing at values.
 */

export type ImportKind = "PRODUCTS" | "OPENING_STOCK";

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  hint: string;
  /** Normalized header names that are safe to suggest automatically. */
  synonyms: readonly string[];
}

export const PRODUCT_FIELDS: readonly ImportField[] = [
  {
    key: "sku",
    label: "SKU",
    required: true,
    hint: "Kodi unik i produktit. Shkronjat e vogla kthehen në të mëdha.",
    synonyms: [
      "sku",
      "kodi",
      "kodiiproduktit",
      "shifra",
      "artikulli",
      "code",
      "itemcode",
      "productcode",
    ],
  },
  {
    key: "name",
    label: "Emri i produktit",
    required: true,
    hint: "Emërtimi që shfaqet te produkti.",
    synonyms: [
      "emri",
      "emriiproduktit",
      "name",
      "pershkrimi",
      "produkti",
      "emertimi",
      "description",
      "productname",
    ],
  },
  {
    key: "category",
    label: "Kategoria",
    required: true,
    hint: "Alumin, PVC, Aksesorë ose Tjetër. Asnjë kategori nuk hamendësohet.",
    synonyms: ["kategoria", "kategori", "category", "grupi"],
  },
  {
    key: "unit",
    label: "Njësia",
    required: true,
    hint: "Vetëm kg, m² ose copë. Asnjë konvertim mes njësive.",
    synonyms: ["njesia", "njesi", "unit", "uom", "njm"],
  },
  {
    key: "barcode",
    label: "Barkodi",
    required: false,
    hint: "Opsional. Duhet të jetë unik.",
    synonyms: ["barkodi", "barcode", "ean"],
  },
  {
    key: "referencePurchasePrice",
    label: "Çmimi referues i blerjes (pa TVSH)",
    required: false,
    hint: "Opsional, vetëm informues, deri në 3 shifra pas presjes. Mos e lidhni me çmimin e shitjes.",
    synonyms: [
      "cmimiiblerjes",
      "cmimireferues",
      "referencepurchaseprice",
      "purchaseprice",
      "cmimiblerjes",
    ],
  },
];

export const OPENING_FIELDS: readonly ImportField[] = [
  {
    key: "sku",
    label: "SKU",
    required: true,
    hint: "Duhet të ekzistojë tashmë te produktet. Produktet e reja nuk krijohen këtu.",
    synonyms: PRODUCT_FIELDS[0]!.synonyms,
  },
  {
    key: "unit",
    label: "Njësia",
    required: true,
    hint: "Duhet të jetë njësia e produktit. Asnjë konvertim mes njësive.",
    synonyms: PRODUCT_FIELDS[3]!.synonyms,
  },
  {
    key: "quantity",
    label: "Sasia e numëruar",
    required: true,
    hint: "Sasia fizike e numëruar. 0 = zero e verifikuar. Qeliza bosh = e panjohur (nuk shitet).",
    synonyms: [
      "sasia",
      "sasi",
      "quantity",
      "qty",
      "numrimi",
      "numerimi",
      "count",
      "sasiaenumeruar",
    ],
  },
  {
    key: "evidence",
    label: "Dëshmia e numërimit",
    required: false,
    hint: "Opsional: p.sh. leximi i peshores ose fleta e numërimit.",
    synonyms: ["evidenca", "deshmia", "shenime", "shenim", "note", "notes", "peshorja"],
  },
];

export const fieldsFor = (kind: ImportKind): readonly ImportField[] =>
  kind === "PRODUCTS" ? PRODUCT_FIELDS : OPENING_FIELDS;

export type ColumnMapping = Record<string, number>;

/** "Çmimi i Blerjes" → "cmimiiblerjes". */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

/** First-guess mapping from header names; each column is used at most once. The owner confirms it. */
export function suggestMapping(headers: readonly string[], kind: ImportKind): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const field of fieldsFor(kind)) {
    const index = normalized.findIndex(
      (header, position) => !used.has(position) && header !== "" && field.synonyms.includes(header),
    );
    if (index >= 0) {
      mapping[field.key] = index;
      used.add(index);
    }
  }
  return mapping;
}

/** Field → Albanian message. Empty when the mapping can be used. */
export function validateMapping(
  kind: ImportKind,
  headers: readonly string[],
  mapping: unknown,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields = fieldsFor(kind);
  if (typeof mapping !== "object" || mapping === null || Array.isArray(mapping)) {
    return { _form: "Zgjidhni kolonat e skedarit." };
  }
  const entries = mapping as Record<string, unknown>;
  const used = new Map<number, string>();
  for (const field of fields) {
    const raw = entries[field.key];
    if (raw === undefined || raw === null || raw === "") {
      if (field.required) errors[field.key] = `Zgjidhni kolonën për "${field.label}".`;
      continue;
    }
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw >= headers.length) {
      errors[field.key] = "Kolona e zgjedhur nuk ekziston në skedar.";
      continue;
    }
    const other = used.get(raw);
    if (other) {
      errors[field.key] = `Kjo kolonë përdoret tashmë për "${other}".`;
      continue;
    }
    used.set(raw, field.label);
  }
  for (const key of Object.keys(entries)) {
    if (!fields.some((field) => field.key === key) && entries[key] !== undefined) {
      errors._form = "Fushë e panjohur në përzgjedhjen e kolonave.";
    }
  }
  return errors;
}

/** Normalizes a posted mapping (form strings → indexes); blank means "not used". */
export function cleanMapping(kind: ImportKind, raw: Record<string, unknown>): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of fieldsFor(kind)) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") continue;
    const index = typeof value === "number" ? value : Number(value);
    mapping[field.key] = Number.isInteger(index) ? index : -1;
  }
  return mapping;
}
