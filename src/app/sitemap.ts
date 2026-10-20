import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { type AppHref, absoluteUrl, languageAlternates } from "@/lib/seo/urls";

/**
 * Indexable routes. Add a route here when its page ships; dynamic catalogue
 * entries will be appended from the content layer in later phases.
 * No lastModified: we only publish dates we actually know.
 */
const indexableRoutes: AppHref[] = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((href) => ({
    url: absoluteUrl(routing.defaultLocale, href),
    alternates: { languages: languageAlternates(href) },
  }));
}
