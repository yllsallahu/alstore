import type { Locale } from "next-intl";
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { resolveTarget } from "../links";
import type { Block, Inline } from "../schemas";
import { ArticleFigure } from "./article-figure";

export const proseLinkClass =
  "underline decoration-accent underline-offset-4 transition-colors duration-200 ease-standard hover:text-accent-ink";

function InlineText({ parts, locale }: { parts: Inline[]; locale: Locale }) {
  return parts.map((part, index) => {
    if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;

    if ("href" in part) {
      return (
        <a key={index} href={part.href} className={proseLinkClass}>
          {part.text}
        </a>
      );
    }

    const target = resolveTarget(part.to, locale);
    return target.kind === "route" ? (
      <Link key={index} href={target.href} className={proseLinkClass}>
        {part.text}
      </Link>
    ) : (
      <a key={index} href={target.href} className={proseLinkClass}>
        {part.text}
      </a>
    );
  });
}

/** Renders an article body. Headings start at h2: the page owns the h1. */
export function ArticleBody({ blocks, locale }: { blocks: Block[]; locale: Locale }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "h2":
        return (
          <h2
            key={index}
            id={block.id}
            className="mt-14 text-2xl font-semibold text-balance font-stretch-semi-expanded first:mt-0"
          >
            {block.text}
          </h2>
        );
      case "h3":
        return (
          <h3 key={index} className="mt-8 text-xl font-semibold text-balance">
            {block.text}
          </h3>
        );
      case "p":
        return (
          <p key={index} className="mt-5 text-pretty">
            <InlineText parts={block.text} locale={locale} />
          </p>
        );
      case "ul":
        return (
          <ul key={index} className="mt-5 list-disc space-y-2 pl-5 marker:text-accent">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1 text-pretty">
                <InlineText parts={item} locale={locale} />
              </li>
            ))}
          </ul>
        );
      case "formula":
        return (
          <figure key={index} className="mt-6 border-l-2 border-accent bg-paper-sunken px-5 py-4">
            <figcaption className="text-xs font-semibold uppercase tracking-label text-ink-muted">
              {block.label}
            </figcaption>
            <p className="mt-2 text-lg font-semibold tabular-nums">{block.text}</p>
          </figure>
        );
      case "note":
        return (
          <p
            key={index}
            className="mt-6 border-l-2 border-accent bg-paper-sunken px-5 py-4 text-sm text-pretty"
          >
            <InlineText parts={block.text} locale={locale} />
          </p>
        );
      case "table":
        return (
          // Focusable so keyboard users can scroll wide tables on small screens.
          <div
            key={index}
            role="region"
            aria-label={block.caption}
            tabIndex={0}
            className="mt-6 overflow-x-auto border-y border-line"
          >
            <table
              className={cx(
                "w-full border-collapse text-left text-sm tabular-nums",
                block.head.length > 3 && "min-w-xl",
              )}
            >
              <caption className="pt-4 pb-3 text-left font-semibold text-balance">
                {block.caption}
              </caption>
              <thead>
                <tr className="border-b border-line-strong">
                  {block.head.map((cell) => (
                    <th key={cell} scope="col" className="py-2 pr-4 align-bottom font-semibold">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-line last:border-b-0">
                    {row.map((cell, cellIndex) =>
                      cellIndex === 0 ? (
                        <th
                          key={cellIndex}
                          scope="row"
                          className="py-2 pr-4 align-top font-semibold"
                        >
                          {cell}
                        </th>
                      ) : (
                        <td key={cellIndex} className="py-2 pr-4 align-top">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "figure":
        return <ArticleFigure key={index} block={block} />;
    }
  });
}
