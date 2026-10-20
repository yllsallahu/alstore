import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { type AppHref, absoluteUrl, languageAlternates } from "./urls";

/**
 * Open Graph locale codes. Facebook only recognises sq_AL for Albanian; the
 * language part is what matters. English copy is written in British English.
 */
const openGraphLocale: Record<Locale, string> = {
  sq: "sq_AL",
  en: "en_GB",
};

type PageMetadataInput = {
  locale: Locale;
  href: AppHref;
  title: string;
  description: string;
  /** Skip the "%s | AL STORE" template (use for the home page). */
  absoluteTitle?: boolean;
};

/**
 * Per-page metadata: title, description, self-referencing canonical, hreflang
 * alternates and Open Graph. Every indexable page must use this builder.
 */
export function buildPageMetadata({
  locale,
  href,
  title,
  description,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(locale, href);
  const ogImage = brandAssets.ogImage;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(href),
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: openGraphLocale[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => openGraphLocale[l]),
      url,
      title,
      description,
      ...(ogImage && {
        images: [{ url: ogImage.src, width: ogImage.width, height: ogImage.height }],
      }),
    },
  };
}
