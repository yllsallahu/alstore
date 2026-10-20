import type { Locale } from "next-intl";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "./routing";

/**
 * Resolves the `[locale]` route param for layouts, pages and generateMetadata.
 * Unknown locales 404; known locales are registered for static rendering.
 */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
