import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand/brand-mark";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { navHref, primaryNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { HeaderFrame } from "./header-frame";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

/**
 * Sticky site header: logo, primary navigation and a quotation action (lg+), SQ/EN switcher
 * and the mobile menu (< lg). Fixed height, so it never causes layout shift. Solid everywhere
 * except over the dark full-bleed heroes (home, films, system pages), where `HeaderFrame` makes
 * it transparent. The current page is marked in the navigation (`PrimaryNav`).
 */
export function SiteHeader() {
  const t = useTranslations("Layout");
  const tNav = useTranslations("Navigation");
  const locale = useLocale();
  const { phone } = siteConfig.contact;

  const links = primaryNavigation.map((key) => ({
    key,
    href: navHref(key, locale),
    label: tNav(key),
  }));
  const contactHref = navHref("contact", locale);
  const phoneLink = {
    href: `tel:${phone.e164}`,
    display: phone.display,
    label: t("callLabel", { phone: phone.display }),
  };

  return (
    <HeaderFrame>
      <Container className="flex h-16 items-center gap-8 sm:h-20">
        <Link href="/" aria-label={t("homeLinkLabel")} className="-mx-1 shrink-0 px-1 py-2">
          <BrandMark className="transition-[filter] duration-200 ease-standard group-data-overlay/header:brightness-0 group-data-overlay/header:invert" />
        </Link>

        <PrimaryNav label={t("primaryNavLabel")} links={links} />

        <div className="ml-auto flex items-center gap-3 sm:gap-5 lg:ml-0">
          <LocaleSwitcher />
          <div className="hidden lg:block">
            <Link
              href={contactHref}
              className={buttonClasses(
                "primary",
                "group-data-overlay/header:bg-on-graphite group-data-overlay/header:text-ink group-data-overlay/header:hover:bg-on-graphite-muted",
                "sm",
              )}
            >
              {t("quoteAction")}
            </Link>
          </div>
          <MobileNav
            links={links}
            phone={phoneLink}
            quote={{ href: contactHref, label: t("quoteAction") }}
            labels={{ open: t("menuOpen"), close: t("menuClose"), dialog: t("menuLabel") }}
            brand={<BrandMark />}
          />
        </div>
      </Container>
    </HeaderFrame>
  );
}
