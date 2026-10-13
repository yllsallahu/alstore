import { DECIMAL_MESSAGES, parseDecimal } from "@/lib/decimal";
import { UNIT_LABELS } from "@/lib/master-data-labels";
import { fieldErrorsOf, productCreateSchema } from "@/lib/validation/master-data";

import { FORMULA_MARKER } from "./errors";
import type { ColumnMapping } from "./fields";

export interface RowIssue {
  field: string | null;
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export type RowStatus = "VALID" | "WARNING" | "ERROR";

export interface ParsedProductRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  barcode: string | null;
  referencePurchasePrice: string | null;
}

export interface ParsedOpeningRow {
  sku: string;
  unit: string;
  status: "VERIFIED_QTY" | "VERIFIED_ZERO" | "UNKNOWN";
  quantity: string | null;
  evidence: string | null;
}

export const error = (field: string | null, code: string, message: string): RowIssue => ({
  field,
  code,
  message,
  severity: "ERROR",
});
export const warning = (field: string | null, code: string, message: string): RowIssue => ({
  field,
  code,
  message,
  severity: "WARNING",
});

export const statusOf = (issues: readonly RowIssue[]): RowStatus =>
  issues.some((issue) => issue.severity === "ERROR")
    ? "ERROR"
    : issues.length > 0
      ? "WARNING"
      : "VALID";

const cellAt = (cells: readonly string[], mapping: ColumnMapping, field: string): string => {
  const index = mapping[field];
  return index === undefined ? "" : (cells[index] ?? "").trim();
};

const compact = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[\s.^_-]/g, "")
    .replace(/²/g, "2");

const UNIT_ALIASES: Record<string, "KG" | "M2" | "COPE"> = {
  kg: "KG",
  kgr: "KG",
  kilogram: "KG",
  kilogramm: "KG",
  kilogrami: "KG",
  m2: "M2",
  sqm: "M2",
  metërkatror: "M2",
  meterkatror: "M2",
  mkatror: "M2",
  cope: "COPE",
  cop: "COPE",
  copa: "COPE",
  pc: "COPE",
  pcs: "COPE",
  piece: "COPE",
  pieces: "COPE",
};

/** Recognizes only spellings of the three allowed units; nothing is converted. */
export function parseUnitLabel(value: string): "KG" | "M2" | "COPE" | null {
  const key = compact(value);
  const direct = Object.keys(UNIT_ALIASES).find((alias) => compact(alias) === key);
  return direct ? UNIT_ALIASES[direct]! : null;
}

const CATEGORY_ALIASES: Record<string, string> = {
  aluminium: "ALUMINIUM",
  aluminum: "ALUMINIUM",
  alumin: "ALUMINIUM",
  alumini: "ALUMINIUM",
  al: "ALUMINIUM",
  pvc: "PVC",
  aksesor: "ACCESSORY",
  aksesore: "ACCESSORY",
  accessory: "ACCESSORY",
  accessories: "ACCESSORY",
  tjeter: "OTHER",
  tjera: "OTHER",
  tetjera: "OTHER",
  other: "OTHER",
};

export function parseCategoryLabel(value: string): string | null {
  return CATEGORY_ALIASES[compact(value)] ?? null;
}

const unitMessage = (value: string) =>
  `Njësia "${value}" nuk njihet. Lejohen vetëm ${UNIT_LABELS.KG}, ${UNIT_LABELS.M2} dhe ${UNIT_LABELS.COPE}.`;
const formulaIssue = (field: string) =>
  error(
    field,
    "FORMULA",
    "Qeliza përmban formulë. Ruajeni si vlerë të shkruar (jo formulë) dhe ngarkojeni përsëri.",
  );

/** Field-level parsing of one product row. Cross-row and database checks come separately. */
export function parseProductRow(
  cells: readonly string[],
  mapping: ColumnMapping,
): { parsed: ParsedProductRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const raw = {
    sku: cellAt(cells, mapping, "sku"),
    name: cellAt(cells, mapping, "name"),
    category: cellAt(cells, mapping, "category"),
    unit: cellAt(cells, mapping, "unit"),
    barcode: cellAt(cells, mapping, "barcode"),
    referencePurchasePrice: cellAt(cells, mapping, "referencePurchasePrice"),
  };
  const formulaFields = Object.entries(raw)
    .filter(([, value]) => value === FORMULA_MARKER)
    .map(([field]) => field);
  for (const field of formulaFields) issues.push(formulaIssue(field));

  const category = raw.category === "" ? null : parseCategoryLabel(raw.category);
  const unit = raw.unit === "" ? null : parseUnitLabel(raw.unit);
  if (!formulaFields.includes("category")) {
    if (raw.category === "") issues.push(error("category", "REQUIRED", "Zgjidhni kategorinë."));
    else if (!category) {
      issues.push(
        error(
          "category",
          "CATEGORY",
          `Kategoria "${raw.category}" nuk njihet. Lejohen: Alumin, PVC, Aksesorë, Tjetër.`,
        ),
      );
    }
  }
  if (!formulaFields.includes("unit")) {
    if (raw.unit === "")
      issues.push(error("unit", "REQUIRED", "Shkruani njësinë: kg, m² ose copë."));
    else if (!unit) issues.push(error("unit", "UNIT", unitMessage(raw.unit)));
  }

  const result = productCreateSchema.safeParse({
    sku: raw.sku,
    name: raw.name,
    category: category ?? "OTHER",
    unit: unit ?? "COPE",
    barcode: raw.barcode,
    referencePurchasePrice: raw.referencePurchasePrice,
  });
  if (!result.success) {
    for (const [field, message] of Object.entries(fieldErrorsOf(result.error))) {
      if (formulaFields.includes(field)) continue;
      issues.push(error(field === "_form" ? null : field, "INVALID", message));
    }
  }
  if (issues.some((issue) => issue.severity === "ERROR") || !result.success || !category || !unit) {
    return { parsed: null, issues };
  }
  return {
    parsed: {
      sku: result.data.sku,
      name: result.data.name,
      category,
      unit,
      barcode: result.data.barcode,
      referencePurchasePrice: result.data.referencePurchasePrice,
    },
    issues,
  };
}

const compactSku = (sku: string) => sku.replace(/[./_-]/g, "");
const nameKey = (name: string) => compact(name);

export interface ExistingProduct {
  sku: string;
  barcode: string | null;
  name: string;
}

export interface StagedProductRow {
  rowNo: number;
  parsed: ParsedProductRow | null;
  issues: RowIssue[];
}

const rowList = (rows: readonly number[]) => rows.join(", ");

/**
 * Duplicate detection. Same SKU or barcode (in the file or already in the catalog) is an ERROR —
 * every involved row, so nothing is picked arbitrarily. Same display name, or a SKU that differs
 * only by separators, is a WARNING that the approver must acknowledge.
 */
export function applyProductDuplicateChecks(
  rows: StagedProductRow[],
  existing: readonly ExistingProduct[],
): void {
  const bySku = new Map<string, number[]>();
  const byBarcode = new Map<string, number[]>();
  const byCompactSku = new Map<string, number[]>();
  const byName = new Map<string, number[]>();
  const push = (map: Map<string, number[]>, key: string, rowNo: number) =>
    map.set(key, [...(map.get(key) ?? []), rowNo]);

  for (const row of rows) {
    if (!row.parsed) continue;
    push(bySku, row.parsed.sku, row.rowNo);
    if (row.parsed.barcode) push(byBarcode, row.parsed.barcode, row.rowNo);
    push(byCompactSku, compactSku(row.parsed.sku), row.rowNo);
    push(byName, nameKey(row.parsed.name), row.rowNo);
  }
  const existingBySku = new Map(existing.map((p) => [p.sku, p]));
  const existingByBarcode = new Map(
    existing.filter((p) => p.barcode).map((p) => [p.barcode as string, p]),
  );

  for (const row of rows) {
    const parsed = row.parsed;
    if (!parsed) continue;
    const skuRows = bySku.get(parsed.sku) ?? [];
    if (skuRows.length > 1) {
      row.issues.push(
        error(
          "sku",
          "DUPLICATE_IN_FILE",
          `SKU "${parsed.sku}" shfaqet në rreshtat ${rowList(skuRows)}.`,
        ),
      );
    }
    const barcodeRows = parsed.barcode ? (byBarcode.get(parsed.barcode) ?? []) : [];
    if (barcodeRows.length > 1) {
      row.issues.push(
        error(
          "barcode",
          "DUPLICATE_IN_FILE",
          `Barkodi shfaqet në rreshtat ${rowList(barcodeRows)}.`,
        ),
      );
    }
    const found = existingBySku.get(parsed.sku);
    if (found) {
      row.issues.push(
        error(
          "sku",
          "SKU_EXISTS",
          `SKU ekziston tashmë te produktet: ${found.sku} — ${found.name}.`,
        ),
      );
    }
    const barcodeFound = parsed.barcode ? existingByBarcode.get(parsed.barcode) : undefined;
    if (barcodeFound) {
      row.issues.push(
        error(
          "barcode",
          "BARCODE_EXISTS",
          `Barkodi i përket tashmë produktit ${barcodeFound.sku}.`,
        ),
      );
    }
    const similarSku = (byCompactSku.get(compactSku(parsed.sku)) ?? []).filter(
      (n) => n !== row.rowNo && !skuRows.includes(n),
    );
    const similarExistingSku = existing.find(
      (p) => p.sku !== parsed.sku && compactSku(p.sku) === compactSku(parsed.sku),
    );
    if (similarSku.length > 0 || similarExistingSku) {
      row.issues.push(
        warning(
          "sku",
          "SKU_SIMILAR",
          similarExistingSku
            ? `SKU shumë e ngjashme me ${similarExistingSku.sku} (ndryshon vetëm nga shenjat ndarëse).`
            : `SKU shumë e ngjashme me rreshtin ${rowList(similarSku)} (ndryshon vetëm nga shenjat ndarëse).`,
        ),
      );
    }
    const sameName = (byName.get(nameKey(parsed.name)) ?? []).filter((n) => n !== row.rowNo);
    const sameNameExisting = existing.find((p) => nameKey(p.name) === nameKey(parsed.name));
    if (sameName.length > 0 || sameNameExisting) {
      row.issues.push(
        warning(
          "name",
          "NAME_DUPLICATE",
          sameNameExisting
            ? `Emër i njëjtë me produktin ${sameNameExisting.sku}.`
            : `Emër i njëjtë me rreshtin ${rowList(sameName)}.`,
        ),
      );
    }
  }
}

export interface ExistingOpeningProduct {
  id: string;
  sku: string;
  unit: string;
  active: boolean;
}

export interface StagedOpeningRow {
  rowNo: number;
  parsed: ParsedOpeningRow | null;
  issues: RowIssue[];
  productId: string | null;
}

/**
 * One opening-count row. A positive number is VERIFIED_QTY, `0` is VERIFIED_ZERO and an empty
 * cell is UNKNOWN (INV-09): an empty cell is never read as zero.
 */
export function parseOpeningRow(
  cells: readonly string[],
  mapping: ColumnMapping,
): { parsed: ParsedOpeningRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const skuRaw = cellAt(cells, mapping, "sku");
  const unitRaw = cellAt(cells, mapping, "unit");
  const quantityRaw = cellAt(cells, mapping, "quantity");
  const evidenceRaw = cellAt(cells, mapping, "evidence");

  let sku = "";
  if (skuRaw === FORMULA_MARKER) issues.push(formulaIssue("sku"));
  else {
    sku = skuRaw.toUpperCase();
    if (sku === "") issues.push(error("sku", "REQUIRED", "Shkruani SKU-në."));
    else if (!/^[A-Z0-9][A-Z0-9./_-]{0,39}$/.test(sku)) {
      issues.push(
        error(
          "sku",
          "SKU_FORMAT",
          "SKU lejon vetëm shkronja latine, shifra dhe . / _ - (deri 40).",
        ),
      );
    }
  }

  let unit: "KG" | "M2" | "COPE" | null = null;
  if (unitRaw === FORMULA_MARKER) issues.push(formulaIssue("unit"));
  else if (unitRaw === "")
    issues.push(error("unit", "REQUIRED", "Shkruani njësinë: kg, m² ose copë."));
  else {
    unit = parseUnitLabel(unitRaw);
    if (!unit) issues.push(error("unit", "UNIT", unitMessage(unitRaw)));
  }

  let status: ParsedOpeningRow["status"] = "UNKNOWN";
  let quantity: string | null = null;
  if (quantityRaw === FORMULA_MARKER) issues.push(formulaIssue("quantity"));
  else if (quantityRaw !== "") {
    const parsed = parseDecimal(quantityRaw, { scale: 3 });
    if (!parsed.ok) {
      issues.push(error("quantity", "QUANTITY", DECIMAL_MESSAGES[parsed.error](3)));
    } else if (/^0+\.000$/.test(parsed.value)) {
      status = "VERIFIED_ZERO";
      quantity = "0.000";
    } else {
      status = "VERIFIED_QTY";
      quantity = parsed.value;
    }
  }

  let evidence: string | null = null;
  if (evidenceRaw === FORMULA_MARKER) issues.push(formulaIssue("evidence"));
  else if (evidenceRaw !== "") {
    if (evidenceRaw.length > 200) {
      issues.push(error("evidence", "EVIDENCE", "Dëshmia lejon deri në 200 shenja."));
    } else evidence = evidenceRaw;
  }

  if (issues.some((issue) => issue.severity === "ERROR") || !unit) return { parsed: null, issues };
  return { parsed: { sku, unit, status, quantity, evidence }, issues };
}

/** Product matching and duplicate detection for opening rows. No product is ever created here. */
export function resolveOpeningRows(
  rows: StagedOpeningRow[],
  productsBySku: ReadonlyMap<string, ExistingOpeningProduct>,
): void {
  const bySku = new Map<string, number[]>();
  for (const row of rows) {
    if (row.parsed) bySku.set(row.parsed.sku, [...(bySku.get(row.parsed.sku) ?? []), row.rowNo]);
  }
  for (const row of rows) {
    const parsed = row.parsed;
    if (!parsed) continue;
    const sameSku = bySku.get(parsed.sku) ?? [];
    if (sameSku.length > 1) {
      row.issues.push(
        error(
          "sku",
          "DUPLICATE_IN_FILE",
          `SKU "${parsed.sku}" shfaqet në rreshtat ${rowList(sameSku)}. Lini vetëm një numërim për SKU.`,
        ),
      );
      continue;
    }
    const product = productsBySku.get(parsed.sku);
    if (!product) {
      row.issues.push(
        error(
          "sku",
          "UNKNOWN_SKU",
          `SKU "${parsed.sku}" nuk ekziston te produktet. Importoni ose krijoni produktin më parë; këtu nuk krijohen produkte.`,
        ),
      );
      continue;
    }
    row.productId = product.id;
    if (product.unit !== parsed.unit) {
      const label = (unit: string) => UNIT_LABELS[unit as keyof typeof UNIT_LABELS] ?? unit;
      row.issues.push(
        error(
          "unit",
          "UNIT_MISMATCH",
          `Njësia në skedar (${label(parsed.unit)}) ndryshon nga njësia e produktit (${label(product.unit)}). Nuk bëhet asnjë konvertim.`,
        ),
      );
    }
    if (!product.active) {
      row.issues.push(
        warning(
          "sku",
          "INACTIVE_PRODUCT",
          "Produkti është joaktiv. Numërimi ruhet por produkti nuk shitet derisa të aktivizohet.",
        ),
      );
    }
  }
}
