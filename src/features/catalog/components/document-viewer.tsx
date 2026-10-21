"use client";

// Client Component: choosing a document and a category filter is interactive.

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { DownloadIcon, ExternalIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { documentDate, documentFact, documentTitle } from "../document-copy";
import {
  type DocumentGroup,
  type DocumentId,
  type TechnicalDocument,
  initialDocumentId,
  kindMessageKey,
} from "../documents";

const filters = ["all", "aluminium", "pvc", "manufacturer"] as const;

type Filter = (typeof filters)[number];

type DocumentViewerProps = {
  documents: readonly TechnicalDocument[];
};

function isGroup(value: string): value is DocumentGroup {
  return value === "aluminium" || value === "pvc" || value === "manufacturer";
}

export function DocumentViewer({ documents }: DocumentViewerProps) {
  const t = useTranslations("Documents");
  const detailId = useId();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<DocumentId>(initialDocumentId);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!isGroup(hash)) return;
      setFilter(hash);
      const first = documents.find((document) => document.group === hash);
      if (first) setSelectedId(first.id);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [documents]);

  const visible = documents.filter((document) => filter === "all" || document.group === filter);
  const selected = visible.find((document) => document.id === selectedId) ?? visible[0];

  function selectFilter(next: Filter) {
    setFilter(next);
    const first = documents.find((document) => next === "all" || document.group === next);
    if (first) setSelectedId(first.id);
    const url = new URL(window.location.href);
    url.hash = next === "all" ? "" : next;
    window.history.replaceState(null, "", url);
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

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <ul aria-label={t("listLabel")} className="border-b border-line">
            {visible.map((document) => {
              const isSelected = document.id === selected.id;
              return (
                <li key={document.id} className="border-t border-line">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-controls={detailId}
                    onClick={() => setSelectedId(document.id)}
                    className={cx(
                      "flex min-h-11 w-full flex-col items-start gap-1 py-4 text-left transition-colors duration-250 ease-standard",
                      isSelected ? "text-brand" : "text-ink hover:text-brand",
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-label">
                      {t(`kinds.${kindMessageKey[document.kind]}`)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {document.series
                        ? t("seriesHeading", { series: document.series })
                        : document.reportNumber}
                    </span>
                    <span className={cx("text-sm", isSelected ? "text-brand" : "text-ink-muted")}>
                      {documentTitle(t, document.id)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <article id={detailId} aria-live="polite" className="lg:col-span-8">
          <p className="text-xs font-semibold uppercase tracking-label text-brand">
            {t(`kinds.${kindMessageKey[selected.kind]}`)}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-balance font-stretch-semi-expanded">
            {title}
          </h2>
          {selected.series ? (
            <p className="mt-3 text-sm text-ink-muted tabular-nums">
              {t("seriesHeading", { series: selected.series })}
            </p>
          ) : selected.kind === "certification" ? (
            <p className="mt-3 text-sm text-ink-muted">{t("notAProductSeries")}</p>
          ) : null}

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

          {selected.kind === "test-report" ? (
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
                    className={buttonClasses("primary")}
                  >
                    {t("open")}
                    <ExternalIcon className="size-4" />
                    <span className="sr-only"> ({t("newTab")})</span>
                  </a>
                  {isHosted ? (
                    <a href={fileLink.href} download className={buttonClasses("secondary")}>
                      {t("download")}
                      <DownloadIcon className="size-4" />
                    </a>
                  ) : (
                    <a
                      href={fileLink.href}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses("secondary")}
                    >
                      {t("download")}
                      <DownloadIcon className="size-4" />
                      <span className="sr-only"> ({t("newTab")})</span>
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
