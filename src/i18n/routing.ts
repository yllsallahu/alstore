import { defineRouting } from "next-intl/routing";

/**
 * Locale routing for the whole site. See docs/ARCHITECTURE.md ("Localization")
 * and docs/SEO_RULES.md ("URLs") before changing anything here.
 *
 * - Albanian is the default and is served without a prefix: /
 * - English is served under /en
 * - No Accept-Language redirects and no locale cookie: every URL always returns
 *   the same language, which keeps crawling and caching predictable.
 * - `pathnames` maps internal route keys to localized slugs. Add every new
 *   route here with an Albanian and an English slug.
 */
export const routing = defineRouting({
  locales: ["sq", "en"],
  defaultLocale: "sq",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  pathnames: {
    "/": "/",
    "/documents": {
      sq: "/dokumentet",
      en: "/documents",
    },
  },
});
