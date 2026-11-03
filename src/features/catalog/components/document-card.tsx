import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { documentDate, documentTitle } from "../document-copy";
import { documentCovers } from "../document-covers";
import { type TechnicalDocument, kindMessageKey } from "../documents";

type DocumentCardProps = {
  document: TechnicalDocument;
  /** Background the card sits on; the cover well takes the other tone. */
  tone?: "paper" | "sunken";
  sizes?: string;
};

/**
 * A document shown by its real first page: the cover sits in a tinted well and lifts on hover,
 * with the kind, report title and issuer underneath. Opens the document in the
 * technical-resources explorer (`/documents#<id>`), where it can be previewed and downloaded.
 */
export async function DocumentCard({
  document,
  tone = "paper",
  sizes = "(min-width: 64rem) 18rem, 50vw",
}: DocumentCardProps) {
  const t = await getTranslations("Documents");
  const tResources = await getTranslations("TechnicalResources");
  const title = documentTitle(t, document.id);
  const year = document.issuedOn ? documentDate(t, document.issuedOn) : null;

  return (
    <Link href={{ pathname: "/documents", hash: document.id }} className="group block">
      <span
        className={cx(
          "relative block aspect-3/4 overflow-hidden border border-line px-6 pt-6 sm:px-8 sm:pt-8",
          tone === "paper" ? "bg-paper-sunken" : "bg-paper",
        )}
      >
        <Image
          src={documentCovers[document.id]}
          alt={tResources("coverAlt", { title })}
          sizes={sizes}
          placeholder="blur"
          className="h-auto w-full border border-line transition-transform duration-700 ease-out-soft group-hover:-translate-y-2 motion-reduce:transition-none"
        />
        {document.offer === "not-sold" ? (
          <span className="absolute top-3 left-3 rounded-sm bg-graphite px-2 py-0.5 text-xs font-medium text-on-graphite">
            {t("notSoldTag")}
          </span>
        ) : null}
      </span>
      <span className="mt-4 block text-xs font-medium tracking-label text-accent-ink uppercase">
        {t(`kinds.${kindMessageKey[document.kind]}`)}
      </span>
      <span className="mt-2 flex items-start justify-between gap-3">
        <span className="font-medium text-pretty tabular-nums">{title}</span>
        <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-ink-muted transition duration-300 ease-standard group-hover:translate-x-1 group-hover:text-ink" />
      </span>
      <span className="mt-1 block text-sm text-ink-muted tabular-nums">
        {document.issuer}
        {year ? ` · ${year}` : null}
      </span>
    </Link>
  );
}
