import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { navHash } from "@/config/navigation";
import { ArticleBody, proseLinkClass } from "@/features/knowledge/components/article-body";
import { KnowledgeBreadcrumbs } from "@/features/knowledge/components/knowledge-breadcrumbs";
import { articleHref } from "@/features/knowledge/links";
import { getArticle, isArticleKey } from "@/features/knowledge/queries";
import { articleKeys } from "@/features/knowledge/schemas";
import { articleJsonLd } from "@/features/knowledge/structured-data";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

type Props = PageProps<"/[locale]/knowledge/[article]">;

// Only the published articles exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return articleKeys.map((article) => ({ article }));
}

async function resolveArticle(params: Props["params"]) {
  const locale = await resolveLocale(params);
  const { article: key } = await params;
  if (!isArticleKey(key)) notFound();
  return { locale, article: getArticle(key) };
}

/**
 * Long date in the page language. English uses en-GB ("25 October 2026") to match
 * the British copy; noon UTC keeps the ISO date from shifting a day in Kosovo's zone.
 */
function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sq", {
    dateStyle: "long",
    timeZone: "Europe/Belgrade",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, article } = await resolveArticle(params);
  const content = article.content[locale];
  const metadata = buildPageMetadata({
    locale,
    href: articleHref(article.key),
    title: content.metaTitle,
    description: content.metaDescription,
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: article.reviewedOn,
      modifiedTime: article.reviewedOn,
    },
  };
}

/** Knowledge-centre article: body, table of contents, sources and related reading. */
export default async function KnowledgeArticlePage({ params }: Props) {
  const { locale, article } = await resolveArticle(params);
  const t = await getTranslations("Knowledge");
  const content = article.content[locale];
  const sections = content.body.flatMap((block) => (block.type === "h2" ? [block] : []));
  const sourcesId = locale === "sq" ? "burimet" : "sources";
  const trail = [
    { name: t("home"), href: "/" as const },
    { name: t("eyebrow"), href: "/knowledge" as const },
    { name: content.title, href: articleHref(article.key) },
  ];

  return (
    <>
      <JsonLd data={articleJsonLd(article, locale)} />
      <JsonLd data={breadcrumbJsonLd(locale, trail)} />

      <Container className="py-section">
        <KnowledgeBreadcrumbs trail={trail} />

        <article className="mt-10">
          <header className="max-w-measure">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="mt-6 text-3xl font-semibold text-balance font-stretch-semi-expanded">
              {content.title}
            </h1>
            <p className="mt-6 text-lg text-pretty text-ink-muted">{content.lead}</p>
            <p className="mt-6 text-sm text-ink-muted">
              <time dateTime={article.reviewedOn}>
                {t("reviewed", { date: formatDate(article.reviewedOn, locale) })}
              </time>
              {" · "}
              <a href={`#${sourcesId}`} className={proseLinkClass}>
                {t("sourcesHeading")} ({article.sources.length})
              </a>
            </p>
          </header>

          <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-8">
            <nav aria-labelledby="toc-heading" className="lg:col-span-3">
              <div className="lg:sticky lg:top-28">
                <h2
                  id="toc-heading"
                  className="text-xs font-semibold uppercase tracking-label text-ink-muted"
                >
                  {t("tocHeading")}
                </h2>
                <ol className="mt-4 space-y-1 border-l border-line text-sm">
                  {[...sections, { id: sourcesId, text: t("sourcesHeading") }].map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="-ml-px flex min-h-11 items-center border-l-2 border-transparent pl-4 text-ink-muted transition-colors duration-200 ease-standard hover:border-accent hover:text-ink"
                      >
                        {section.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <div className="max-w-measure min-w-0 lg:col-span-8 lg:col-start-5">
              <ArticleBody blocks={content.body} locale={locale} />

              <section aria-labelledby={sourcesId} className="mt-16 border-t border-line pt-10">
                <h2
                  id={sourcesId}
                  className="text-2xl font-semibold text-balance font-stretch-semi-expanded"
                >
                  {t("sourcesHeading")}
                </h2>
                <p className="mt-4 text-sm text-pretty text-ink-muted">{t("sourcesIntro")}</p>
                <ol className="mt-6 list-decimal space-y-5 pl-5 text-sm marker:text-ink-muted">
                  {article.sources.map((source) => (
                    <li key={source.url} className="pl-1">
                      <a href={source.url} className={`${proseLinkClass} break-words`}>
                        {source.title}
                      </a>
                      <span className="block text-ink-muted">{source.publisher}</span>
                      <span className="mt-1 block text-pretty">{source.usedFor[locale]}</span>
                      <span className="mt-1 block text-ink-muted">
                        {t("accessed", { date: formatDate(source.accessedOn, locale) })}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </article>
      </Container>

      <section aria-labelledby="related-heading" className="border-t border-line bg-paper-sunken">
        <Container className="py-16">
          <Eyebrow as="h2">
            <span id="related-heading">{t("relatedHeading")}</span>
          </Eyebrow>
          <ul className="mt-6 grid border-t border-line md:grid-cols-2 md:gap-x-8">
            {article.related.map((key) => {
              const related = getArticle(key).content[locale];
              return (
                <li key={key} className="border-b border-line py-5">
                  <Link
                    href={articleHref(key)}
                    className="text-xl font-semibold text-balance font-stretch-semi-expanded underline decoration-transparent underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent"
                  >
                    {related.title}
                  </Link>
                  <p className="mt-2 text-sm text-pretty text-ink-muted">{related.excerpt}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/knowledge" className={buttonClasses("secondary")}>
              {t("allArticles")}
            </Link>
            <Link href="/documents" className={buttonClasses("secondary")}>
              {t("documentsAction")}
            </Link>
            <Link
              href={{ pathname: "/", hash: navHash("contact", locale) }}
              className={buttonClasses("primary")}
            >
              {t("contactAction")}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
