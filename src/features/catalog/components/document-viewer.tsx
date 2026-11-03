"use client";

// Client Component: choosing a document, a system group and a category filter is interactive.

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { DownloadIcon, ExternalIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { documentDate, documentFact, documentTitle } from "../document-copy";
import {
  type DocumentGroup,
  type DocumentId,
  type DocumentKind,
  type TechnicalDocument,
  documentKinds,
  everestRoleMessageKey,
  initialDocumentId,
  kindMessageKey,
} from "../documents";

const groups = ["aluminium", "pvc", "manufacturer"] as const satisfies readonly DocumentGroup[];
const filters = ["all", ...groups] as const;

type Filter = (typeof filters)[number];
type KindFilter = "all" | DocumentKind;

type DocumentViewerProps = {
  documents: readonly TechnicalDocument[];
};

function isGroup(value: string): value is DocumentGroup {
  return value === "aluminium" || value === "pvc" || value === "manufacturer";
}

/** The detail pane sits beside the list from `lg` up; below that it is under the list. */
function isWide() {
  return window.matchMedia("(min-width: 64rem)").matches;
}

export function DocumentViewer({ documents }: DocumentViewerProps) {
  const t = useTranslations("Documents");
  const detailId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [selectedId, setSelectedId] = useState<DocumentId>(initialDocumentId);

  useEffect(() => {
    // #aluminium, #pvc, #manufacturer pick a group; #<document id> picks a document.
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      const linked = documents.find((document) => document.id === hash);
      if (linked) {
        setFilter("all");
        setKind("all");
        setSelectedId(linked.id);
        return;
      }
      if (!isGroup(hash)) return;
      setFilter(hash);
      setKind("all");
      const first = documents.find((document) => document.group === hash);
      if (first) setSelectedId(first.id);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [documents]);

  const inGroup = documents.filter((document) => filter === "all" || document.group === filter);
  const kinds = documentKinds.filter((item) => inGroup.some((document) => document.kind === item));
  const visible = inGroup.filter((document) => kind === "all" || document.kind === kind);
  const selected = visible.find((document) => document.id === selectedId) ?? visible[0];

  function replaceHash(hash: string) {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState(null, "", url);
  }

  function selectFilter(next: Filter) {
    setFilter(next);
    setKind("all");
    const first = documents.find((document) => next === "all" || document.group === next);
    if (first) setSelectedId(first.id);
    replaceHash(next === "all" ? "" : next);
  }

  function selectKind(next: KindFilter) {
    setKind(next);
    const first = inGroup.find((document) => next === "all" || document.kind === next);
    if (first) setSelectedId(first.id);
  }

  function selectDocument(id: DocumentId) {
    setSelectedId(id);
    replaceHash(id);
    // On narrow screens the detail is below the list: move there so the choice is visible.
    if (!isWide()) headingRef.current?.focus();
  }

  if (!selected) return null;

  const title = documentTitle(t, selected.id);
  const fileLink = selected.links.find((link) => link.id === "file");
  // Cross-origin files ignore `download`, so they open in a new tab instead.
  const isHosted = fileLink?.href.startsWith("/") ?? false;
  const otherLinks = selected.links.filter(
    (link): link is { id: "registry" | "verification" | "technicalReport"; href: string } =>
      link.id !== "file",
  );
  const fileDescription = t("fileDescription", {
    format: t(`formats.${selected.format}`),
    language: t(`languages.${selected.language}`),
  });

  function systemLine(document: TechnicalDocument) {
    if (document.series) return t("seriesHeading", { series: document.series });
    if (document.coveredSeries.length > 0)
      return t("coveredSeries", { series: document.coveredSeries.join(", ") });
    return t("notAProductSeries");
  }

  return (
    <div className="mt-10">
      <nav aria-label={t("filtersLabel")}>
        <ul className="flex gap-6 overflow-x-auto border-b border-line">
          {filters.map((item) => {
            const isActive = item === filter;
            return (
              <li key={item} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectFilter(item)}
                  className={cx(
                    "min-h-11 border-b-2 text-sm font-semibold transition-colors duration-250 ease-standard",
                    isActive
                      ? "border-brand text-brand"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {t(`filters.${item}`)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {kinds.length > 1 ? (
        <fieldset className="mt-6">
          <legend className="text-xs font-semibold uppercase tracking-label text-ink-muted">
            {t("categoryFilterLabel")}
          </legend>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(["all", ...kinds] as const).map((item) => {
              const isActive = item === kind;
              return (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectKind(item)}
                    className={cx(
                      "min-h-11 rounded-sm border px-3 text-sm font-semibold transition-colors duration-250 ease-standard",
                      isActive
                        ? "border-brand bg-brand text-paper"
                        : "border-line-strong text-ink hover:border-brand hover:text-brand",
                    )}
                  >
                    {item === "all" ? t("categoryAll") : t(`kinds.${kindMessageKey[item]}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-10 lg:col-span-5 xl:col-span-4">
          {groups.map((group) => {
            const items = visible.filter((document) => document.group === group);
            if (items.length === 0) return null;
            const headingId = `${detailId}-${group}`;
            return (
              <section key={group} id={group} aria-labelledby={headingId} className="scroll-mt-24">
                <h3
                  id={headingId}
                  className="text-lg font-semibold text-balance font-stretch-semi-expanded"
                >
                  {t(`groups.${group}`)}
                </h3>
                {group === "manufacturer" ? (
                  <p className="mt-2 text-sm text-pretty text-ink-muted">{t("manufacturerNote")}</p>
                ) : null}
                <ul className="mt-4 border-b border-line">
                  {items.map((document) => {
                    const isSelected = document.id === selected.id;
                    return (
                      <li
                        key={document.id}
                        id={document.id}
                        className="scroll-mt-24 border-t border-line"
                      >
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-controls={detailId}
                          onClick={() => selectDocument(document.id)}
                          className={cx(
                            "flex min-h-11 w-full flex-col items-start gap-1 py-4 text-left transition-colors duration-250 ease-standard",
                            isSelected ? "text-brand" : "text-ink hover:text-brand",
                          )}
                        >
                          <span className="text-xs font-semibold uppercase tracking-label">
                            {t(`kinds.${kindMessageKey[document.kind]}`)}
                          </span>
                          <span className="text-sm font-semibold">
                            {documentTitle(t, document.id)}
                          </span>
                          <span
                            className={cx(
                              "text-sm tabular-nums",
                              isSelected ? "text-brand" : "text-ink-muted",
                            )}
                          >
                            {systemLine(document)}
                          </span>
                          <span
                            className={cx("text-xs", isSelected ? "text-brand" : "text-ink-muted")}
                          >
                            {t(`languages.${document.language}`)} ·{" "}
                            {t(`formats.${document.format}`)} · {document.issuer}
                          </span>
                          {document.everestRole || document.offer === "not-sold" ? (
                            <span className="mt-1 flex flex-wrap gap-2">
                              {document.everestRole ? (
                                <span className="rounded-sm border border-line-strong px-2 py-0.5 text-xs font-semibold text-accent-ink">
                                  {t("everestBadge")}
                                </span>
                              ) : null}
                              {document.offer === "not-sold" ? (
                                <span className="rounded-sm bg-paper-sunken px-2 py-0.5 text-xs font-semibold text-ink">
                                  {t("notSoldTag")}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <article id={detailId} aria-live="polite" className="lg:col-span-7 xl:col-span-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-xs font-semibold uppercase tracking-label text-brand">
              {t(`kinds.${kindMessageKey[selected.kind]}`)}
            </p>
            {selected.everestRole ? (
              <p className="rounded-sm border border-line-strong px-2 py-0.5 text-xs font-semibold text-accent-ink">
                {t("everestBadge")}
              </p>
            ) : null}
          </div>
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 scroll-mt-24 text-2xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {title}
          </h3>
          <p className="mt-3 text-sm text-ink-muted tabular-nums">{systemLine(selected)}</p>

          {selected.offer === "not-sold" ? (
            <p className="mt-6 max-w-measure border border-line bg-paper-sunken px-4 py-3 text-sm text-pretty">
              {t("notSold")}
            </p>
          ) : null}

          {selected.pendingClassification ? (
            <p className="mt-6 max-w-measure border border-line px-4 py-3 text-sm text-pretty">
              {t("pendingClassification")}
            </p>
          ) : null}

          <dl className="mt-6 max-w-measure border-t border-line">
            <div className="border-b border-line py-3">
              <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                {t("issuerLabel")}
              </dt>
              <dd className="mt-1 text-sm">{selected.issuer}</dd>
            </div>
            {selected.everestRole ? (
              <div className="border-b border-line py-3">
                <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                  {t("everestRoleLabel")}
                </dt>
                <dd className="mt-1 text-sm">
                  {t(`everestRoles.${everestRoleMessageKey[selected.everestRole]}`)}
                </dd>
              </div>
            ) : null}
            <div className="border-b border-line py-3">
              <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                {t("languageLabel")}
              </dt>
              <dd className="mt-1 text-sm">{t(`languages.${selected.language}`)}</dd>
            </div>
            <div className="border-b border-line py-3">
              <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                {t("formatLabel")}
              </dt>
              <dd className="mt-1 text-sm">{t(`formats.${selected.format}`)}</dd>
            </div>
            {selected.issuedOn ? (
              <div className="border-b border-line py-3">
                <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                  {t("issuedLabel")}
                </dt>
                <dd className="mt-1 text-sm tabular-nums">{documentDate(t, selected.issuedOn)}</dd>
              </div>
            ) : null}
            {selected.validUntil ? (
              <div className="border-b border-line py-3">
                <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                  {t("validUntilLabel")}
                </dt>
                <dd className="mt-1 text-sm tabular-nums">
                  {documentDate(t, selected.validUntil)}
                </dd>
              </div>
            ) : null}
            {selected.facts.map((fact) => (
              <div key={fact} className="border-b border-line py-3">
                <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                  {t(`labels.${fact}`)}
                </dt>
                <dd className="mt-1 text-sm text-pretty tabular-nums">
                  {documentFact(t, selected.id, fact)}
                </dd>
              </div>
            ))}
          </dl>

          {selected.kind === "test-report" || selected.kind === "thermal-calculation" ? (
            <p className="mt-4 max-w-measure text-sm text-pretty text-ink-muted">
              {t("sampleLimit")} {t("productStandard")}
            </p>
          ) : null}

          <iframe
            key={selected.id}
            title={t("previewFrame", { title })}
            src={selected.previewUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mt-8 h-96 w-full border border-line bg-paper-sunken lg:h-preview"
          />

          {fileLink || otherLinks.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              {fileLink ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={fileLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    type="application/pdf"
                    hrefLang={selected.language}
                    className={buttonClasses("primary")}
                  >
                    {t("open")}
                    <ExternalIcon className="size-4" />
                    <span className="sr-only">
                      {" "}
                      ({fileDescription}, {t("newTab")})
                    </span>
                  </a>
                  {isHosted ? (
                    <a
                      href={fileLink.href}
                      download
                      type="application/pdf"
                      hrefLang={selected.language}
                      className={buttonClasses("secondary")}
                    >
                      {t("download")}
                      <DownloadIcon className="size-4" />
                      <span className="sr-only"> ({fileDescription})</span>
                    </a>
                  ) : (
                    <a
                      href={fileLink.href}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      type="application/pdf"
                      hrefLang={selected.language}
                      className={buttonClasses("secondary")}
                    >
                      {t("download")}
                      <DownloadIcon className="size-4" />
                      <span className="sr-only">
                        {" "}
                        ({fileDescription}, {t("newTab")})
                      </span>
                    </a>
                  )}
                </div>
              ) : null}
              {otherLinks.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {otherLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                      >
                        {t(`links.${link.id}`)}
                        <ExternalIcon className="size-4" />
                        <span className="sr-only"> ({t("newTab")})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
