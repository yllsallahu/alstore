import { IMPORT_LIMITS, ImportFileError } from "./errors";

export interface RawRecord {
  /** 1-based record number, blank records counted so it matches the row number in Excel. */
  rowNo: number;
  cells: string[];
}

const DELIMITERS = [",", ";", "\t"] as const;

/** Picks the delimiter that appears most often in the first non-empty line (outside quotes). */
export function detectDelimiter(text: string): string {
  const line = text.split(/\r\n|\n|\r/).find((candidate) => candidate.trim() !== "") ?? "";
  let best: string = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    let count = 0;
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

/**
 * RFC 4180 CSV: quoted fields, doubled quotes, delimiters and line breaks inside quotes, CRLF/LF/CR.
 * Everything stays a string — numbers are never interpreted here.
 */
export function parseCsv(input: string, delimiter?: string): RawRecord[] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const sep = delimiter ?? detectDelimiter(text);
  const records: RawRecord[] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  let fieldStarted = false;
  let rowNo = 1;

  const endField = () => {
    if (field.length > IMPORT_LIMITS.maxCellChars) {
      throw new ImportFileError(
        "CELL_TOO_LONG",
        `Një qelizë në rreshtin ${rowNo} ka më shumë se ${IMPORT_LIMITS.maxCellChars} shenja.`,
      );
    }
    cells.push(field);
    field = "";
    fieldStarted = false;
    if (cells.length > IMPORT_LIMITS.maxColumns) {
      throw new ImportFileError(
        "TOO_MANY_COLUMNS",
        `Skedari ka më shumë se ${IMPORT_LIMITS.maxColumns} kolona.`,
      );
    }
  };
  const endRecord = () => {
    endField();
    records.push({ rowNo, cells });
    cells = [];
    rowNo += 1;
    if (records.length > IMPORT_LIMITS.maxRows + 1 + 1000) {
      // Blank trailing records are cheap, but an unbounded file is not.
      throw new ImportFileError(
        "TOO_MANY_ROWS",
        `Skedari ka më shumë se ${IMPORT_LIMITS.maxRows} rreshta me të dhëna.`,
      );
    }
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && !fieldStarted && field === "") {
      quoted = true;
      fieldStarted = true;
    } else if (char === sep) {
      endField();
    } else if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
    } else if (char === "\n") {
      endRecord();
    } else {
      field += char;
      fieldStarted = true;
    }
  }
  if (quoted) {
    throw new ImportFileError(
      "CSV_QUOTE",
      "Skedari CSV ka një thonjëz që nuk mbyllet. Kontrolloni qelizat me thonjëza.",
    );
  }
  if (field !== "" || cells.length > 0 || fieldStarted) endRecord();
  return records;
}
