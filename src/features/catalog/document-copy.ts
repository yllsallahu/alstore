import type { useTranslations } from "next-intl";
import type { DocumentId, FactKey } from "./documents";

type DocumentsTranslator = ReturnType<typeof useTranslations<"Documents">>;

/** Message paths are fixed per document id in sq.json. The cast keeps the call dynamic. */
export function documentTitle(t: DocumentsTranslator, id: DocumentId) {
  return t(`items.${id}.title` as Parameters<DocumentsTranslator>[0]);
}

export function documentFact(t: DocumentsTranslator, id: DocumentId, fact: FactKey) {
  return t(`items.${id}.${fact}` as Parameters<DocumentsTranslator>[0]);
}

/** Fixed catalogue date. Intl is not used: server and browser locale data differ. */
export function documentDate(t: DocumentsTranslator, iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;

  return t("date", {
    day: String(Number(day)),
    month: t(`months.m${month}` as Parameters<DocumentsTranslator>[0]),
    year,
  });
}
