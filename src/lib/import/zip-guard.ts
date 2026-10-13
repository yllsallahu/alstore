import { IMPORT_LIMITS, ImportFileError } from "./errors";

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const hasPrefix = (bytes: Uint8Array, prefix: number[]) =>
  bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value);

/**
 * Reads only the zip central directory, before any library inflates a single byte, and refuses
 * a file that is not a plain .xlsx (encrypted/legacy, macros, zip64, path tricks, zip bombs).
 */
export function assertSafeXlsx(bytes: Uint8Array): void {
  if (hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new ImportFileError(
      "XLSX_LEGACY",
      "Skedari është i mbrojtur me fjalëkalim ose është format i vjetër (.xls). Ruajeni si .xlsx pa fjalëkalim ose si CSV.",
    );
  }
  if (!hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new ImportFileError("XLSX_NOT_ZIP", "Skedari nuk është një dokument .xlsx i vlefshëm.");
  }
  const data = view(bytes);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i -= 1) {
    if (data.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new ImportFileError("XLSX_CORRUPT", "Skedari .xlsx është i dëmtuar ose i paplotë.");
  }
  const entries = data.getUint16(eocd + 10, true);
  const directorySize = data.getUint32(eocd + 12, true);
  const directoryOffset = data.getUint32(eocd + 16, true);
  if (entries === 0xffff || directoryOffset === 0xffffffff || directorySize === 0xffffffff) {
    throw new ImportFileError("XLSX_ZIP64", "Skedari .xlsx është shumë i madh ose i pambështetur.");
  }
  if (entries === 0 || entries > IMPORT_LIMITS.maxZipEntries) {
    throw new ImportFileError("XLSX_ENTRIES", "Struktura e skedarit .xlsx nuk është e pranueshme.");
  }
  if (directoryOffset + directorySize > eocd) {
    throw new ImportFileError("XLSX_CORRUPT", "Skedari .xlsx është i dëmtuar ose i paplotë.");
  }

  let offset = directoryOffset;
  let total = 0;
  const names: string[] = [];
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > eocd || data.getUint32(offset, true) !== 0x02014b50) {
      throw new ImportFileError("XLSX_CORRUPT", "Skedari .xlsx është i dëmtuar ose i paplotë.");
    }
    const flags = data.getUint16(offset + 8, true);
    const uncompressed = data.getUint32(offset + 24, true);
    const nameLength = data.getUint16(offset + 28, true);
    const extraLength = data.getUint16(offset + 30, true);
    const commentLength = data.getUint16(offset + 32, true);
    if (offset + 46 + nameLength > eocd) {
      throw new ImportFileError("XLSX_CORRUPT", "Skedari .xlsx është i dëmtuar ose i paplotë.");
    }
    if (flags & 0x1) {
      throw new ImportFileError(
        "XLSX_ENCRYPTED",
        "Skedari .xlsx është i enkriptuar. Ruajeni pa fjalëkalim.",
      );
    }
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name.startsWith("/") || name.split("/").includes("..") || name.includes("\\")) {
      throw new ImportFileError("XLSX_PATH", "Struktura e skedarit .xlsx nuk është e pranueshme.");
    }
    names.push(name);
    total += uncompressed;
    if (total > IMPORT_LIMITS.maxUncompressedBytes) {
      throw new ImportFileError(
        "XLSX_BOMB",
        "Skedari .xlsx zgjerohet në një madhësi të papranueshme. Ruajeni vetëm me të dhënat e nevojshme.",
      );
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (names.some((name) => /vbaProject\.bin$/i.test(name))) {
    throw new ImportFileError(
      "XLSX_MACRO",
      "Skedarët me makro nuk pranohen. Ruajeni si .xlsx të zakonshëm ose si CSV.",
    );
  }
  if (
    !names.includes("[Content_Types].xml") ||
    !names.some((n) => n.startsWith("xl/worksheets/"))
  ) {
    throw new ImportFileError("XLSX_NOT_SHEET", "Skedari nuk është një fletë llogaritjeje .xlsx.");
  }
}
