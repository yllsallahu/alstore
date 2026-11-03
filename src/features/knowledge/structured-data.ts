import type { Locale } from "next-intl";
import { brandAssets } from "@/config/brand";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo/urls";
import { articleHref } from "./links";
import type { KnowledgeArticle } from "./schemas";

/**
 * schema.org Article for a knowledge-centre page. Author and publisher are the
 * business (no invented people). `citation` lists the article's sources;
 * local PDFs are made absolute. No image until approved artwork exists.
 */
export function articleJsonLd(article: KnowledgeArticle, locale: Locale) {
  const content = article.content[locale];
  const url = absoluteUrl(locale, articleHref(article.key));
  const logo = brandAssets.logo.primary;
  const organization = {
    "@type": "Organization",
    "@id": `${env.siteUrl}/#business`,
    name: siteConfig.name,
    url: absoluteUrl(locale, "/"),
    ...(logo && {
      logo: { "@type": "ImageObject", url: new URL(logo.src, `${env.siteUrl}/`).toString() },
    }),
  };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: content.title,
    description: content.metaDescription,
    inLanguage: locale,
    datePublished: article.reviewedOn,
    dateModified: article.reviewedOn,
    author: organization,
    publisher: organization,
    citation: article.sources.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      publisher: { "@type": "Organization", name: source.publisher },
      url: new URL(source.url, `${env.siteUrl}/`).toString(),
    })),
  };
}
