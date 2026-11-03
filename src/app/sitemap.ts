import type { MetadataRoute } from "next";
import { listSystemPages } from "@/features/catalog/system-specs";
import { articleHref } from "@/features/knowledge/links";
import { articleKeys } from "@/features/knowledge/schemas";
import { routing } from "@/i18n/routing";
import { type AppHref, absoluteUrl, languageAlternates } from "@/lib/seo/urls";

/**
 * Indexable routes. Add a route here when its page ships; dynamic catalogue
 * entries will be appended from the content layer in later phases.
 * No lastModified: we only publish dates we actually know.
 */
const indexableRoutes: AppHref[] = [
  "/",
  "/about",
  "/films",
  "/documents",
  "/systems/compare",
  ...listSystemPages().map(({ slug }): AppHref => ({
    pathname: "/systems/[slug]",
    params: { slug },
  })),
  "/knowledge",
  ...articleKeys.map(articleHref),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((href) => ({
    url: absoluteUrl(routing.defaultLocale, href),
    alternates: { languages: languageAlternates(href) },
  }));
}
