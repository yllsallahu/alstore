import { getTranslations } from "next-intl/server";
import { documentFact, documentTitle } from "./document-copy";
import { type DocumentId, technicalDocuments } from "./documents";
import {
  type ComparableKey,
  type SpecRow,
  type SpecValue,
  specRows,
  systemSpecs,
} from "./system-specs";

/** Keeps a series number such as "71 000" on one line (a no-break space between the groups). */
export function keepSeriesTogether(text: string): string {
  return text.replace(/(\d) (\d{3})/g, "$1\u00a0$2");
}

/** A specification value as displayed: the text, where it comes from, and its document. */
export type SpecCell = {
  text: string;
  source: string;
  /** Compact source for dense layouts: the report number, or the EVEREST site. */
  shortSource: string;
  documentId: DocumentId | null;
} | null;

export type SpecTable = {
  rows: { row: SpecRow; label: string; cells: Record<ComparableKey, SpecCell> }[];
};

/** Resolves the specification model to localized text for the given systems. */
export async function resolveSpecTable(keys: readonly ComparableKey[]): Promise<SpecTable> {
  const t = await getTranslations("SystemSpecs");
  const tDocuments = await getTranslations("Documents");

  const cell = (value: SpecValue): SpecCell => {
    if (!value) return null;
    if (value.source === "everest") {
      return {
        text: t(`values.${value.statement}`),
        source: t("sources.everest"),
        shortSource: t("sources.everestShort"),
        documentId: null,
      };
    }
    return {
      text: documentFact(tDocuments, value.documentId, value.fact),
      source: documentTitle(tDocuments, value.documentId),
      shortSource:
        technicalDocuments.find(({ id }) => id === value.documentId)?.reportNumber ??
        value.documentId,
      documentId: value.documentId,
    };
  };

  return {
    rows: specRows.map((row) => ({
      row,
      label: t(`rows.${row}`),
      cells: Object.fromEntries(keys.map((key) => [key, cell(systemSpecs(key)[row])])) as Record<
        ComparableKey,
        SpecCell
      >,
    })),
  };
}
