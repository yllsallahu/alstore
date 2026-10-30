import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { resolveLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { archivo } from "@/styles/fonts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: t("defaultTitle"),
      template: `%s | ${siteConfig.name}`,
    },
    description: t("defaultDescription"),
    applicationName: siteConfig.name,
    // Indexing is opt-in per deployment (SITE_INDEXABLE); see docs/SEO_RULES.md.
    robots: env.indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Layout");
  const messages = await getMessages();

  return (
    <html lang={locale} className={archivo.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:text-paper"
        >
          {t("skipToContent")}
        </a>
        {/* Only namespaces used by Client Components are sent to the browser. */}
        <NextIntlClientProvider
          messages={{
            LocaleSwitcher: messages.LocaleSwitcher,
            TruckScrollHero: messages.TruckScrollHero,
            Documents: messages.Documents,
            Error: messages.Error,
          }}
        >
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
