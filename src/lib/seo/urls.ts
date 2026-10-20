import type { Locale } from "next-intl";
import { env } from "@/config/env";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Any internal route accepted by the localized navigation APIs. */
export type AppHref = Parameters<typeof getPathname>[0]["href"];

/** Absolute, localized URL for a route, e.g. ("en", "/") -> https://www.alstore-ks.com/en */
export function absoluteUrl(locale: Locale, href: AppHref): string {
  return new URL(getPathname({ locale, href }), `${env.siteUrl}/`).toString();
}

/** hreflang map for a route: one entry per locale plus x-default (Albanian). */
export function languageAlternates(href: AppHref): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, absoluteUrl(locale, href)])),
    "x-default": absoluteUrl(routing.defaultLocale, href),
  };
}
