"use client";

// Client Component: filtering the library and opening a document in a modal dialog are
// interactive, and `/documents#<id>` deep links must open that document on arrival.

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import {
  ArrowRightIcon,
  CloseIcon,
  DownloadIcon,
  ExternalIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { technicalFilms } from "@/features/films/films";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { documentDate, documentFact, documentTitle } from "../document-copy";
import { documentCovers } from "../document-covers";
import {
  type DocumentGroup,
  type DocumentId,
  type DocumentKind,
  type TechnicalDocument,
  documentKinds,
  everestRoleMessageKey,
  kindMessageKey,
} from "../documents";

const groups = ["aluminium", "pvc", "manufacturer"] as const satisfies readonly DocumentGroup[];
type GroupFilter = "all" | DocumentGroup;
type KindFilter = "all" | DocumentKind;

type DocumentLibraryProps = {
  documents: readonly TechnicalDocument[];
};

const isGroup = (value: string): value is DocumentGroup =>
  (groups as readonly string[]).includes(value);

const chipClass = (active: boolean) =>
  cx(
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-standard",
    active
      ? "border-ink bg-ink text-paper"
      : "border-line text-ink-muted hover:border-ink hover:text-ink",
  );

/**
 * Technical-resources library: filter by product group and document kind, browse every
 * document by its real first page, and open one in a dialog with its facts, a full PDF preview
 * and the file actions. `#<id>` opens a document; `#aluminium`, `#pvc`, `#manufacturer` filter.
 */
export function DocumentLibrary({ documents }: DocumentLibraryProps) {
  const t = useTranslations("Documents");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [group, setGroup] = useState<GroupFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [openId, setOpenId] = useState<DocumentId | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      const linked = documents.find((document) => document.id === hash);
      if (linked) {
        setOpenId(linked.id);
        return;
      }
      if (isGroup(hash)) {
        setGroup(hash);
        setKind("all");
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [documents]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openId && !dialog.open) dialog.showModal();
    if (!openId && dialog.open) dialog.close();
  }, [openId]);

  function replaceHash(hash: string) {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState(null, "", url);
  }

  function open(id: DocumentId) {
    setOpenId(id);
    replaceHash(id);
  }

  function onClose() {
    setOpenId(null);
    replaceHash(group === "all" ? "" : group);
  }

  function selectGroup(next: GroupFilter) {
    setGroup(next);
    setKind("all");
    replaceHash(next === "all" ? "" : next);
  }

  const inGroup = documents.filter((document) => group === "all" || document.group === group);
  const kinds = documentKinds.filter((item) => inGroup.some((document) => document.kind === item));
  const visible = inGroup.filter((document) => kind === "all" || document.kind === kind);
  const selected = documents.find((document) => document.id === openId) ?? null;

  function seriesLine(document: TechnicalDocument) {
    if (document.series) return t("seriesHeading", { series: document.series });
    if (document.coveredSeries.length > 0)
      return t("coveredSeries", { series: document.coveredSeries.join(", ") });
    return t("notAProductSeries");
  }

  return (
    <div>
      <div className="sticky top-16 z-30 border-y border-line bg-paper sm:top-20">
        <nav
          aria-label={t("filtersLabel")}
          className="mx-auto flex max-w-site flex-col gap-3 px-gutter py-3 lg:flex-row lg:items-center lg:justify-between"
        >
          <ul className="-mx-gutter flex gap-2 overflow-x-auto px-gutter lg:mx-0 lg:px-0">
            {(["all", ...groups] as const).map((item) => (
              <li key={item}>
                <button
                  type="button"
                  aria-pressed={item === group}
                  onClick={() => selectGroup(item)}
                  className={chipClass(item === group)}
                >
                  {t(`filters.${item}`)}
                  <span className="text-xs tabular-nums opacity-70">
                    {item === "all"
                      ? documents.length
                      : documents.filter((document) => document.group === item).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {kinds.length > 1 ? (
            <ul
              aria-label={t("categoryFilterLabel")}
              className="-mx-gutter flex gap-1 overflow-x-auto px-gutter lg:mx-0 lg:px-0"
            >
              {(["all", ...kinds] as const).map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={item === kind}
                    onClick={() => setKind(item)}
                    className={cx(
                      "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors duration-200 ease-standard",
                      item === kind
                        ? "border-accent text-ink"
                        : "border-transparent text-ink-muted hover:text-ink",
                    )}
                  >
                    {item === "all" ? t("categoryAll") : t(`kinds.${kindMessageKey[item]}`)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>

      <div className="mx-auto flex max-w-site flex-col gap-section px-gutter py-section">
        {groups.map((item) => {
          const items = visible.filter((document) => document.group === item);
          if (items.length === 0) return null;
          return (
            <section
              key={item}
              id={item}
              aria-labelledby={`${item}-heading`}
              className="scroll-mt-40"
            >
              <div className="grid gap-4 border-t border-ink pt-5 md:grid-cols-12 md:items-baseline">
                <h2
                  id={`${item}-heading`}
                  className="text-3xl font-light text-balance font-stretch-semi-expanded md:col-span-6"
                >
                  {t(`groups.${item}`)}
                </h2>
                <p className="text-sm text-pretty text-ink-muted md:col-span-6 md:justify-self-end md:text-right">
                  {item === "manufacturer"
                    ? t("manufacturerNote")
                    : t("count", { count: items.length })}
                </p>
              </div>
              <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                {items.map((document) => (
                  <li key={document.id}>
                    <button
                      type="button"
                      onClick={() => open(document.id)}
                      aria-haspopup="dialog"
                      className="group block w-full text-left"
                    >
                      <span className="relative block aspect-3/4 overflow-hidden border border-line bg-paper-sunken px-6 pt-8 sm:px-8 sm:pt-10">
                        <Image
                          src={documentCovers[document.id]}
                          alt=""
                          sizes="(min-width: 64rem) 18rem, 50vw"
                          placeholder="blur"
                          className="h-auto w-full border border-line transition-transform duration-700 ease-out-soft group-hover:-translate-y-2 motion-reduce:transition-none"
                        />
                        <span className="absolute top-3 left-3 rounded-sm bg-paper px-2 py-0.5 text-xs font-medium text-ink tabular-nums">
                          {document.series ?? t(`kinds.${kindMessageKey[document.kind]}`)}
                        </span>
                        {document.offer === "not-sold" ? (
                          <span className="absolute top-3 right-3 rounded-sm bg-graphite px-2 py-0.5 text-xs font-medium text-on-graphite">
                            {t("notSoldTag")}
                          </span>
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-graphite px-4 py-3 text-sm text-on-graphite opacity-0 transition-opacity duration-300 ease-standard group-hover:opacity-100 group-focus-visible:opacity-100">
                          {t("viewDetails")}
                          <ArrowRightIcon className="size-4" />
                        </span>
                      </span>
                      <span className="mt-4 block text-xs font-medium tracking-label text-accent-ink uppercase">
                        {t(`kinds.${kindMessageKey[document.kind]}`)}
                      </span>
                      <span className="mt-2 block font-medium text-pretty tabular-nums">
                        {documentTitle(t, document.id)}
                      </span>
                      <span className="mt-1 block text-sm text-ink-muted tabular-nums">
                        {document.issuer}
                        {document.issuedOn ? ` · ${documentDate(t, document.issuedOn)}` : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        aria-labelledby="document-dialog-title"
        className="m-auto h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-graphite/70 lg:h-5/6 lg:max-w-site"
      >
        {selected ? (
          <DocumentDetail
            key={selected.id}
            document={selected}
            seriesLine={seriesLine(selected)}
            onClose={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </div>
  );
}

type DocumentDetailProps = {
  document: TechnicalDocument;
  seriesLine: string;
  onClose: () => void;
};

/** Dialog body: facts and actions beside the full PDF preview (stacked on small screens). */
function DocumentDetail({ document, seriesLine, onClose }: DocumentDetailProps) {
  const t = useTranslations("Documents");
  const title = documentTitle(t, document.id);
  const file = document.links.find((link) => link.id === "file");
  // Cross-origin files ignore `download`, so they open in a new tab instead.
  const isHosted = file?.href.startsWith("/") ?? false;
  const otherLinks = document.links.filter(
    (link): link is { id: "registry" | "verification" | "technicalReport"; href: string } =>
      link.id !== "file",
  );
  const fileDescription = t("fileDescription", {
    format: t(`formats.${document.format}`),
    language: t(`languages.${document.language}`),
  });
  const film = technicalFilms.find((candidate) => candidate.series === document.series);
  const label = "text-xs font-medium uppercase tracking-label text-ink-muted";

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-6 border-b border-line px-gutter py-5 lg:px-10">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium tracking-label text-accent-ink uppercase">
            {t(`kinds.${kindMessageKey[document.kind]}`)}
            {document.everestRole ? (
              <span className="rounded-sm border border-line-strong px-2 py-0.5 tracking-normal normal-case">
                {t("everestBadge")}
              </span>
            ) : null}
          </p>
          <h2
            id="document-dialog-title"
            className="mt-2 text-2xl font-light text-balance tabular-nums font-stretch-semi-expanded"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted tabular-nums">{seriesLine}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center text-ink transition-colors duration-200 ease-standard hover:text-accent-ink"
        >
          <CloseIcon />
          <span className="sr-only">{t("close")}</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-12 lg:overflow-hidden">
        <div className="px-gutter py-6 lg:col-span-5 lg:overflow-y-auto lg:px-10">
          {document.offer === "not-sold" ? (
            <p className="mb-6 border border-line bg-paper-sunken px-4 py-3 text-sm text-pretty">
              {t("notSold")}
            </p>
          ) : null}
          {document.pendingClassification ? (
            <p className="mb-6 border border-line px-4 py-3 text-sm text-pretty">
              {t("pendingClassification")}
            </p>
          ) : null}

          <dl className="grid grid-cols-2 gap-x-6 border-t border-line">
            <div className="border-b border-line py-3">
              <dt className={label}>{t("issuerLabel")}</dt>
              <dd className="mt-1 text-sm">{document.issuer}</dd>
            </div>
            {document.issuedOn ? (
              <div className="border-b border-line py-3">
                <dt className={label}>{t("issuedLabel")}</dt>
                <dd className="mt-1 text-sm tabular-nums">{documentDate(t, document.issuedOn)}</dd>
              </div>
            ) : null}
            {document.validUntil ? (
              <div className="border-b border-line py-3">
                <dt className={label}>{t("validUntilLabel")}</dt>
                <dd className="mt-1 text-sm tabular-nums">
                  {documentDate(t, document.validUntil)}
                </dd>
              </div>
            ) : null}
            {document.everestRole ? (
              <div className="border-b border-line py-3">
                <dt className={label}>{t("everestRoleLabel")}</dt>
                <dd className="mt-1 text-sm">
                  {t(`everestRoles.${everestRoleMessageKey[document.everestRole]}`)}
                </dd>
              </div>
            ) : null}
            <div className="border-b border-line py-3">
              <dt className={label}>{t("languageLabel")}</dt>
              <dd className="mt-1 text-sm">{t(`languages.${document.language}`)}</dd>
            </div>
            <div className="border-b border-line py-3">
              <dt className={label}>{t("formatLabel")}</dt>
              <dd className="mt-1 text-sm">{t(`formats.${document.format}`)}</dd>
            </div>
            {document.facts.map((fact) => (
              <div key={fact} className="col-span-2 border-b border-line py-3">
                <dt className={label}>{t(`labels.${fact}`)}</dt>
                <dd className="mt-1 text-sm text-pretty tabular-nums">
                  {documentFact(t, document.id, fact)}
                </dd>
              </div>
            ))}
          </dl>

          {document.kind === "test-report" || document.kind === "thermal-calculation" ? (
            <p className="mt-4 text-sm text-pretty text-ink-muted">
              {t("sampleLimit")} {t("productStandard")}
            </p>
          ) : null}

          {file ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href={file.href}
                target="_blank"
                rel="noopener noreferrer"
                type="application/pdf"
                hrefLang={document.language}
                className={buttonClasses("primary")}
              >
                {t("open")}
                <ExternalIcon className="size-4" />
                <span className="sr-only">
                  {" "}
                  ({fileDescription}, {t("newTab")})
                </span>
              </a>
              <a
                href={file.href}
                {...(isHosted
                  ? { download: true }
                  : { target: "_blank", rel: "noopener noreferrer" })}
                type="application/pdf"
                hrefLang={document.language}
                className={buttonClasses("secondary")}
              >
                {t("download")}
                <DownloadIcon className="size-4" />
                <span className="sr-only"> ({fileDescription})</span>
              </a>
            </div>
          ) : null}

          {otherLinks.length > 0 || film ? (
            <ul className="mt-6 flex flex-col">
              {otherLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                  >
                    {t(`links.${link.id}`)}
                    <ExternalIcon className="size-4" />
                    <span className="sr-only"> ({t("newTab")})</span>
                  </a>
                </li>
              ))}
              {film ? (
                <li>
                  <Link
                    href={{ pathname: "/films", hash: film.key }}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                  >
                    <PlayIcon className="size-3.5 fill-current" />
                    {t("filmLink")}
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="hidden border-l border-line bg-paper-sunken lg:col-span-7 lg:block">
          <iframe
            title={t("previewFrame", { title })}
            src={document.previewUrl}
            referrerPolicy="no-referrer"
            className="size-full"
          />
        </div>
      </div>
    </div>
  );
}
