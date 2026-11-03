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
    "/about": {
      sq: "/rreth-nesh",
      en: "/about",
    },
    "/films": {
      sq: "/video",
      en: "/videos",
    },
    "/documents": {
      sq: "/dokumentet",
      en: "/documents",
    },
    // System pages exist only for systems with verified documents (src/features/catalog/
    // system-specs.ts). The slug is the series number in both locales. The static
    // compare route takes precedence over the slug.
    "/systems/compare": {
      sq: "/sistemet/krahaso",
      en: "/systems/compare",
    },
    "/systems/[slug]": {
      sq: "/sistemet/[slug]",
      en: "/systems/[slug]",
    },
    // Return 404 until enough approved projects exist (src/features/projects/queries.ts).
    "/projects": {
      sq: "/projekte",
      en: "/projects",
    },
    "/projects/[slug]": {
      sq: "/projekte/[slug]",
      en: "/projects/[slug]",
    },
    // Knowledge centre: one static key per article (src/features/knowledge/), so each
    // locale keeps its own slug and the locale switcher needs no slug mapping.
    "/knowledge": {
      sq: "/njohuri",
      en: "/knowledge",
    },
    "/knowledge/thermal-break": {
      sq: "/njohuri/nderprerja-termike-ne-profilet-e-aluminit",
      en: "/knowledge/thermal-break-aluminium-profiles",
    },
    "/knowledge/u-values": {
      sq: "/njohuri/vlerat-u-te-dritareve-uf-ug-uw",
      en: "/knowledge/window-u-values-uf-ug-uw",
    },
    "/knowledge/performance-classes": {
      sq: "/njohuri/klasat-e-ajrit-ujit-dhe-eres-te-dritaret",
      en: "/knowledge/window-air-water-wind-classes",
    },
  },
});
