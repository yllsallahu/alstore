"use client";

// Client Component because it needs the current pathname to link to the same
// page in the other language. It ships only the LocaleSwitcher messages.

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cx } from "@/lib/cx";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const activeLocale = useLocale();
  // When dynamic routes are added, pass { pathname, params: useParams() } instead.
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex items-center text-sm font-semibold uppercase tracking-wide">
        {routing.locales.map((locale) => {
          const isActive = locale === activeLocale;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={isActive ? "true" : undefined}
                className={cx(
                  "inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 transition-colors duration-200 ease-standard",
                  isActive
                    ? "border-accent text-ink group-data-overlay/header:text-on-graphite"
                    : "border-transparent text-ink-muted hover:text-ink group-data-overlay/header:text-on-graphite group-data-overlay/header:hover:text-on-graphite",
                )}
              >
                <span aria-hidden="true">{locale}</span>
                <span className="sr-only">{t(locale)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
