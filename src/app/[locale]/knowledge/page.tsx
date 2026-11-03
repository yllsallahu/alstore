import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { KnowledgeBreadcrumbs } from "@/features/knowledge/components/knowledge-breadcrumbs";
import { articleHref } from "@/features/knowledge/links";
import { listArticles } from "@/features/knowledge/queries";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/knowledge">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Knowledge" });

  return buildPageMetadata({
    locale,
    href: "/knowledge",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Knowledge centre index: the published articles, in editorial order. */
export default async function KnowledgePage({ params }: PageProps<"/[locale]/knowledge">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Knowledge");
  const articles = listArticles();
  const trail = [
    { name: t("home"), href: "/" as const },
    { name: t("eyebrow"), href: "/knowledge" as const },
  ];

  return (
    <Container className="py-section">
      <JsonLd data={breadcrumbJsonLd(locale, trail)} />
      <KnowledgeBreadcrumbs trail={trail} />
      <Eyebrow className="mt-10">{t("eyebrow")}</Eyebrow>
      <h1 className="mt-6 max-w-measure text-3xl font-semibold text-balance font-stretch-semi-expanded">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-measure text-lg text-pretty text-ink-muted">{t("intro")}</p>
      <p className="mt-4 max-w-measure text-sm text-pretty text-ink-muted">{t("method")}</p>

      <ol aria-label={t("listLabel")} className="mt-14 border-t border-line">
        {articles.map((article, index) => {
          const content = article.content[locale];
          return (
            <li key={article.key} className="border-b border-line">
              <Link
                href={articleHref(article.key)}
                className="group grid gap-4 py-8 transition-colors duration-200 ease-standard hover:bg-paper-sunken md:grid-cols-12 md:gap-8 md:px-4"
              >
                <span
                  aria-hidden="true"
                  className="text-sm font-semibold text-accent-ink tabular-nums md:col-span-1"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="md:col-span-7">
                  <h2 className="text-xl font-semibold text-balance font-stretch-semi-expanded group-hover:text-accent-ink">
                    {content.title}
                  </h2>
                  <p className="mt-3 text-pretty text-ink-muted">{content.excerpt}</p>
                </div>
                <span className="inline-flex items-center gap-2 self-end text-sm font-semibold md:col-span-4 md:justify-self-end">
                  {t("readArticle")}
                  <ArrowRightIcon className="size-5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Container>
  );
}
