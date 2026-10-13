import ExcelJS from "exceljs";

import { parseCsv, type RawRecord } from "@/lib/import/csv";
import { FORMULA_MARKER, IMPORT_LIMITS, ImportFileError } from "@/lib/import/errors";
import { assertSafeXlsx } from "@/lib/import/zip-guard";

export interface ParsedImportFile {
  format: "CSV" | "XLSX";
  sheetName: string | null;
  headers: string[];
  /** Data rows only (header excluded), blank rows dropped, `rowNo` as the owner sees it. */
  rows: RawRecord[];
}

const extensionOf = (name: string) =>
  /\.([A-Za-z0-9]+)$/.exec(name.trim())?.[1]?.toLowerCase() ?? "";

function toHeaderAndRows(records: RawRecord[]): { headers: string[]; rows: RawRecord[] } {
  const headerIndex = records.findIndex((record) =>
    record.cells.some((cell) => cell.trim() !== ""),
  );
  if (headerIndex < 0) {
    throw new ImportFileError(
      "EMPTY_FILE",
      "Skedari është bosh. Duhet të ketë një rresht me titujt e kolonave.",
    );
  }
  const header = records[headerIndex]!;
  let width = header.cells.length;
  while (width > 0 && header.cells[width - 1]!.trim() === "") width -= 1;
  const headers = header.cells.slice(0, width).map((cell) => cell.trim());
  if (headers.length === 0) {
    throw new ImportFileError("EMPTY_FILE", "Rreshti i titujve është bosh.");
  }
  const seen = new Set<string>();
  for (const title of headers) {
    const key = title.toLowerCase();
    if (title !== "" && seen.has(key)) {
      throw new ImportFileError(
        "DUPLICATE_HEADER",
        `Titulli "${title}" shfaqet më shumë se një herë. Çdo kolonë duhet të ketë titull unik.`,
      );
    }
    seen.add(key);
  }
  const rows = records
    .slice(headerIndex + 1)
    .filter((record) => record.cells.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) {
    throw new ImportFileError("NO_ROWS", "Skedari nuk ka asnjë rresht me të dhëna nën titujt.");
  }
  if (rows.length > IMPORT_LIMITS.maxRows) {
    throw new ImportFileError(
      "TOO_MANY_ROWS",
      `Skedari ka ${rows.length} rreshta; lejohen deri në ${IMPORT_LIMITS.maxRows}. Ndajeni në disa skedarë.`,
    );
  }
  return { headers, rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) return FORMULA_MARKER;
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("error" in value) return String(value.error);
    if ("text" in value) return String(value.text);
  }
  return "";
}

async function parseXlsx(bytes: Uint8Array): Promise<ParsedImportFile> {
  assertSafeXlsx(bytes);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  } catch {
    throw new ImportFileError(
      "XLSX_CORRUPT",
      "Skedari .xlsx nuk mund të lexohet. Ruajeni përsëri nga Excel.",
    );
  }
  const sheet = workbook.worksheets.find((candidate) => candidate.state === "visible");
  if (!sheet) throw new ImportFileError("NO_SHEET", "Skedari .xlsx nuk ka asnjë fletë të dukshme.");
  if (sheet.rowCount > IMPORT_LIMITS.maxRows + 1000) {
    throw new ImportFileError(
      "TOO_MANY_ROWS",
      `Fleta ka më shumë se ${IMPORT_LIMITS.maxRows} rreshta. Ndajeni në disa skedarë.`,
    );
  }
  if (sheet.actualColumnCount > IMPORT_LIMITS.maxColumns) {
    throw new ImportFileError(
      "TOO_MANY_COLUMNS",
      `Fleta ka më shumë se ${IMPORT_LIMITS.maxColumns} kolona.`,
    );
  }
  const width = sheet.actualColumnCount;
  const records: RawRecord[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    for (let column = 1; column <= width; column += 1) {
      const text = cellToString(row.getCell(column).value);
      if (text.length > IMPORT_LIMITS.maxCellChars) {
        throw new ImportFileError(
          "CELL_TOO_LONG",
          `Një qelizë në rreshtin ${rowNumber} ka më shumë se ${IMPORT_LIMITS.maxCellChars} shenja.`,
        );
      }
      cells.push(text);
    }
    records.push({ rowNo: rowNumber, cells });
  });
  const { headers, rows } = toHeaderAndRows(records);
  return { format: "XLSX", sheetName: sheet.name, headers, rows };
}

function parseCsvBytes(bytes: Uint8Array): ParsedImportFile {
  if (bytes.includes(0)) {
    throw new ImportFileError("CSV_BINARY", "Skedari nuk duket si CSV (përmban të dhëna binare).");
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new ImportFileError(
      "CSV_IS_ZIP",
      "Ky skedar është arkiv ose .xlsx dhe jo CSV. Ndryshoni shtesën në .xlsx.",
    );
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ImportFileError(
      "CSV_ENCODING",
      'Skedari CSV duhet të jetë UTF-8, që ruhen ë dhe ç saktë. Në Excel zgjidhni "CSV UTF-8 (i ndarë me presje)".',
    );
  }
  const { headers, rows } = toHeaderAndRows(parseCsv(text));
  return { format: "CSV", sheetName: null, headers, rows };
}

/**
 * Reads a prepared CSV/XLSX upload into strings. Extension and content must agree; formulas are
 * never evaluated, macros/encrypted/legacy files and zip bombs are refused before parsing.
 */
export async function parseImportFile(
  fileName: string,
  bytes: Uint8Array,
): Promise<ParsedImportFile> {
  if (bytes.length === 0) throw new ImportFileError("EMPTY_FILE", "Skedari është bosh.");
  if (bytes.length > IMPORT_LIMITS.maxFileBytes) {
    throw new ImportFileError(
      "FILE_TOO_LARGE",
      `Skedari është më i madh se ${IMPORT_LIMITS.maxFileBytes / (1024 * 1024)} MB.`,
    );
  }
  switch (extensionOf(fileName)) {
    case "csv":
      return parseCsvBytes(bytes);
    case "xlsx":
      return parseXlsx(bytes);
    case "xls":
    case "xlsm":
    case "xlsb":
      throw new ImportFileError(
        "FORMAT",
        "Pranohen vetëm skedarë .csv dhe .xlsx pa makro. Ruajeni përsëri nga Excel si .xlsx ose CSV UTF-8.",
      );
    default:
      throw new ImportFileError("FORMAT", "Pranohen vetëm skedarë .csv dhe .xlsx.");
  }
}
