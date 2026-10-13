import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { detectDelimiter, parseCsv } from "@/lib/import/csv";
import { FORMULA_MARKER, IMPORT_LIMITS, ImportFileError } from "@/lib/import/errors";
import { cleanMapping, suggestMapping, validateMapping } from "@/lib/import/fields";
import {
  applyProductDuplicateChecks,
  parseOpeningRow,
  parseProductRow,
  parseUnitLabel,
  resolveOpeningRows,
  statusOf,
  type StagedOpeningRow,
  type StagedProductRow,
} from "@/lib/import/rows";
import { assertSafeXlsx } from "@/lib/import/zip-guard";
import { parseImportFile } from "@/server/import/parse-file";

const bytes = (text: string) => new TextEncoder().encode(text);
const code = async (promise: Promise<unknown> | (() => void)) => {
  try {
    if (typeof promise === "function") promise();
    else await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ImportFileError);
    return (error as ImportFileError).code;
  }
  return undefined;
};

async function workbook(build: (sheet: ExcelJS.Worksheet, book: ExcelJS.Workbook) => void) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Produktet");
  build(sheet, book);
  return new Uint8Array(await book.xlsx.writeBuffer());
}

describe("csv", () => {
  it("detects the delimiter and strips a BOM", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(parseCsv("﻿SKU;Emri\nA1;Profil")[0]!.cells).toEqual(["SKU", "Emri"]);
  });

  it("handles quoted separators, quotes and line breaks inside cells", () => {
    const rows = parseCsv('SKU;Emri\nA1;"Profil; ""special""\ni dytë"\nA2;Plain');
    expect(rows[1]!.cells).toEqual(["A1", 'Profil; "special"\ni dytë']);
    expect(rows[2]!.rowNo).toBe(3);
  });

  it("keeps blank records so row numbers match the spreadsheet", () => {
    const rows = parseCsv("SKU;Emri\n\nA1;Profil");
    expect(rows.map((r) => r.rowNo)).toEqual([1, 2, 3]);
  });
});

describe("parseImportFile", () => {
  it("reads a CSV", async () => {
    const parsed = await parseImportFile("a.csv", bytes("SKU;Emri\nA1;Profil"));
    expect(parsed.format).toBe("CSV");
    expect(parsed.headers).toEqual(["SKU", "Emri"]);
    expect(parsed.rows).toHaveLength(1);
  });

  it("rejects a non UTF-8 CSV, NUL bytes, a zip renamed to csv and unknown extensions", async () => {
    expect(
      await code(parseImportFile("a.csv", new Uint8Array([0x53, 0x4b, 0x55, 0xff, 0xc3, 0x28]))),
    ).toBeDefined();
    expect(await code(parseImportFile("a.csv", new Uint8Array([0x41, 0x00, 0x42])))).toBeDefined();
    expect(
      await code(parseImportFile("a.csv", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]))),
    ).toBeDefined();
    expect(await code(parseImportFile("a.xls", bytes("x")))).toBeDefined();
    expect(await code(parseImportFile("a.xlsm", bytes("x")))).toBeDefined();
    expect(await code(parseImportFile("a.txt", bytes("x")))).toBeDefined();
  });

  it("enforces the row, column and size limits", async () => {
    const tooMany = [
      "SKU;Emri",
      ...Array.from({ length: IMPORT_LIMITS.maxRows + 1 }, (_, i) => `A${i};n`),
    ].join("\n");
    expect(await code(parseImportFile("a.csv", bytes(tooMany)))).toBeDefined();
    const wide = Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, (_, i) => `c${i}`).join(";");
    expect(await code(parseImportFile("a.csv", bytes(`${wide}\n1`)))).toBeDefined();
    expect(
      await code(parseImportFile("a.csv", new Uint8Array(IMPORT_LIMITS.maxFileBytes + 1).fill(65))),
    ).toBeDefined();
    expect(await code(parseImportFile("a.csv", bytes("")))).toBeDefined();
  });

  it("reads the first sheet of an xlsx and renders numbers without float noise", async () => {
    const file = await workbook((sheet) => {
      sheet.addRow(["SKU", "Emri", "Sasia"]);
      sheet.addRow(["A1", "Profil", 12.5]);
      sheet.addRow(["A2", "Profil dy", 0]);
    });
    const parsed = await parseImportFile("a.xlsx", file);
    expect(parsed.format).toBe("XLSX");
    expect(parsed.rows[0]!.cells).toEqual(["A1", "Profil", "12.5"]);
    expect(parsed.rows[1]!.cells[2]).toBe("0");
  });

  it("turns formula cells into the formula marker", async () => {
    const file = await workbook((sheet) => {
      sheet.addRow(["SKU", "Sasia"]);
      sheet.addRow(["A1", { formula: "1+1", result: 2 }]);
    });
    const parsed = await parseImportFile("a.xlsx", file);
    expect(parsed.rows[0]!.cells[1]).toBe(FORMULA_MARKER);
  });
});

describe("xlsx zip guard", () => {
  it("accepts a normal workbook", async () => {
    const file = await workbook((sheet) => sheet.addRow(["SKU"]));
    expect(() => assertSafeXlsx(file)).not.toThrow();
  });

  it("rejects legacy/encrypted OLE files, non-zip data and truncated files", async () => {
    expect(
      await code(() => assertSafeXlsx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]))),
    ).toBe("XLSX_LEGACY");
    expect(await code(() => assertSafeXlsx(bytes("not a zip")))).toBe("XLSX_NOT_ZIP");
    const file = await workbook((sheet) => sheet.addRow(["SKU"]));
    expect(
      await code(() => assertSafeXlsx(file.slice(0, Math.floor(file.length / 2)))),
    ).toBeDefined();
  });

  it("rejects workbooks with macros", async () => {
    const zip = await JSZip.loadAsync(await workbook((sheet) => sheet.addRow(["SKU"])));
    zip.file("xl/vbaProject.bin", "x");
    const withMacro = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    expect(await code(() => assertSafeXlsx(withMacro))).toBeDefined();
  });

  it("rejects path traversal entries and decompression bombs", async () => {
    const traversal = await JSZip.loadAsync(await workbook((sheet) => sheet.addRow(["SKU"])));
    traversal.file("../evil.txt", "x");
    const traversalBytes = new Uint8Array(await traversal.generateAsync({ type: "uint8array" }));
    expect(await code(() => assertSafeXlsx(traversalBytes))).toBeDefined();

    const bomb = await JSZip.loadAsync(await workbook((sheet) => sheet.addRow(["SKU"])));
    bomb.file("xl/worksheets/sheet1.xml", "0".repeat(IMPORT_LIMITS.maxUncompressedBytes + 1024), {
      compression: "DEFLATE",
    });
    const bytesOut = new Uint8Array(
      await bomb.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    );
    expect(bytesOut.length).toBeLessThan(IMPORT_LIMITS.maxFileBytes);
    expect(await code(() => assertSafeXlsx(bytesOut))).toBeDefined();
  });
});

describe("mapping", () => {
  const headers = ["Kodi", "Emërtimi", "Kategori", "Njësia", "Tjetër"];

  it("suggests only by header names and never maps two fields to one column", () => {
    const mapping = suggestMapping(headers, "PRODUCTS");
    expect(mapping).toMatchObject({ sku: 0, name: 1, category: 2, unit: 3 });
    expect(new Set(Object.values(mapping)).size).toBe(Object.values(mapping).length);
  });

  it("validates required fields, ranges and duplicates in Albanian", () => {
    expect(validateMapping("PRODUCTS", headers, { sku: 0, name: 1, category: 2, unit: 3 })).toEqual(
      {},
    );
    const errors = validateMapping("PRODUCTS", headers, { sku: 0, name: 0, category: 9 });
    expect(errors.name).toContain("përdoret tashmë");
    expect(errors.category).toContain("nuk ekziston");
    expect(errors.unit).toContain("Zgjidhni");
    expect(
      validateMapping("PRODUCTS", headers, { sku: 0, name: 1, category: 2, unit: 3, hack: 4 })
        ._form,
    ).toBeDefined();
  });

  it("cleans a posted form mapping", () => {
    expect(
      cleanMapping("OPENING_STOCK", { sku: "0", unit: "1", quantity: "2", evidence: "" }),
    ).toEqual({
      sku: 0,
      unit: 1,
      quantity: 2,
    });
  });
});

describe("product row validation", () => {
  const mapping = { sku: 0, name: 1, category: 2, unit: 3, barcode: 4, referencePurchasePrice: 5 };

  it("accepts unit spellings and normalizes the SKU", () => {
    expect(parseUnitLabel("kg")).toBe("KG");
    expect(parseUnitLabel("M2")).toBe("M2");
    expect(parseUnitLabel("m²")).toBe("M2");
    expect(parseUnitLabel("copë")).toBe("COPE");
    expect(parseUnitLabel("cope")).toBe("COPE");
    expect(parseUnitLabel("litra")).toBeNull();
    const { parsed, issues } = parseProductRow(
      ["al-01", "Profil", "Alumin", "kg", "", "12,5"],
      mapping,
    );
    expect(issues).toEqual([]);
    expect(parsed).toMatchObject({ sku: "AL-01", unit: "KG", referencePurchasePrice: "12.500" });
  });

  it("reports each problem on its field and never guesses a unit or category", () => {
    const { parsed, issues } = parseProductRow(["", "", "Diçka", "litra", "", "1,2345"], mapping);
    expect(parsed).toBeNull();
    const fields = issues.map((i) => i.field);
    expect(fields).toEqual(
      expect.arrayContaining(["sku", "name", "category", "unit", "referencePurchasePrice"]),
    );
    expect(statusOf(issues)).toBe("ERROR");
  });

  it("treats a formula cell as an error", () => {
    const { issues } = parseProductRow(["A1", FORMULA_MARKER, "Alumin", "kg", "", ""], mapping);
    expect(issues.some((i) => i.code === "FORMULA")).toBe(true);
  });

  it("duplicates: same SKU or barcode is an error on all rows; similar SKU or same name is a warning", () => {
    const stage = (cells: string[], rowNo: number): StagedProductRow => {
      const { parsed, issues } = parseProductRow(cells, mapping);
      return { rowNo, parsed, issues };
    };
    const rows = [
      stage(["A1", "Një", "Alumin", "kg", "1111", ""], 2),
      stage(["a1", "Dy", "Alumin", "kg", "", ""], 3),
      stage(["B-1", "Tre", "PVC", "kg", "1111", ""], 4),
      stage(["B1", "Katër", "PVC", "kg", "", ""], 5),
      stage(["C1", "Katër", "PVC", "kg", "", ""], 6),
    ];
    applyProductDuplicateChecks(rows, [{ sku: "Z9", barcode: null, name: "Tjetër" }]);
    const status = rows.map((r) => statusOf(r.issues));
    expect(status).toEqual(["ERROR", "ERROR", "ERROR", "WARNING", "WARNING"]);
  });

  it("an existing SKU in the catalog is an error", () => {
    const { parsed, issues } = parseProductRow(["A1", "Profil", "Alumin", "kg", "", ""], mapping);
    const rows = [{ rowNo: 2, parsed, issues }];
    applyProductDuplicateChecks(rows, [{ sku: "A1", barcode: null, name: "Ekzistues" }]);
    expect(statusOf(rows[0]!.issues)).toBe("ERROR");
  });
});

describe("opening row validation", () => {
  const mapping = { sku: 0, unit: 1, quantity: 2, evidence: 3 };
  const found = new Map([
    ["A1", { id: "p1", sku: "A1", unit: "KG", active: true }],
    ["M1", { id: "p2", sku: "M1", unit: "M2", active: true }],
  ]);
  const resolve = (cells: string[]) => {
    const { parsed, issues } = parseOpeningRow(cells, mapping);
    const row: StagedOpeningRow = { rowNo: 2, parsed, issues, productId: null };
    resolveOpeningRows([row], found);
    return row;
  };

  it("blank is UNKNOWN, 0 is verified zero, a positive number is verified quantity", () => {
    expect(resolve(["A1", "kg", "", ""]).parsed?.status).toBe("UNKNOWN");
    expect(resolve(["A1", "kg", "0", ""]).parsed?.status).toBe("VERIFIED_ZERO");
    expect(resolve(["A1", "kg", "0,000", ""]).parsed?.status).toBe("VERIFIED_ZERO");
    const qty = resolve(["A1", "kg", "12,5", "numërim 3"]);
    expect(qty.parsed).toMatchObject({ status: "VERIFIED_QTY", quantity: "12.500" });
    expect(statusOf(qty.issues)).not.toBe("ERROR");
  });

  it("rejects negative, over-precise and malformed quantities", () => {
    for (const bad of ["-1", "1,2345", "1.234,5", "abc", "1 2"]) {
      expect(statusOf(resolve(["A1", "kg", bad, ""]).issues)).toBe("ERROR");
    }
  });

  it("never creates a product: an unknown SKU is an error, and a unit mismatch is an error", () => {
    expect(statusOf(resolve(["NUK", "kg", "1", ""]).issues)).toBe("ERROR");
    expect(statusOf(resolve(["M1", "kg", "1", ""]).issues)).toBe("ERROR");
    expect(resolve(["A1", "kg", "1", ""]).productId).toBe("p1");
  });

  it("flags a SKU counted twice in the same file", () => {
    const a = parseOpeningRow(["A1", "kg", "1", ""], mapping);
    const b = parseOpeningRow(["a1", "kg", "2", ""], mapping);
    const rows: StagedOpeningRow[] = [
      { rowNo: 2, parsed: a.parsed, issues: a.issues, productId: null },
      { rowNo: 3, parsed: b.parsed, issues: b.issues, productId: null },
    ];
    resolveOpeningRows(rows, found);
    expect(rows.map((r) => statusOf(r.issues))).toEqual(["ERROR", "ERROR"]);
  });
});
