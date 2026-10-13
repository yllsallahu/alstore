/** A file that cannot be read safely. The message is Albanian and shown to the owner as is. */
export class ImportFileError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ImportFileError";
    this.code = code;
  }
}

/** Hard limits for an uploaded import file (a 100–500 SKU list is far below all of them). */
export const IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 2000,
  maxColumns: 30,
  maxCellChars: 500,
  /** XLSX is a zip: reject a small file that would expand into something huge. */
  maxUncompressedBytes: 25 * 1024 * 1024,
  maxZipEntries: 200,
} as const;

/** Marker for a spreadsheet cell that holds a formula; never evaluated, always a row error. */
export const FORMULA_MARKER = "#FORMULË";
