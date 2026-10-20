import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand/brand-mark";
import { Container } from "@/components/ui/container";
import { navHash, primaryNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { HeaderFrame } from "./header-frame";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";

/**
 * Sticky site header: logo,
 * primary navigation (lg+), phone, SQ/EN switcher and the mobile menu (< lg).
 * Fixed height, so it never causes layout shift. Solid everywhere except over
 * the home hero video, where `HeaderFrame` makes it transparent with light text.
 */
export function SiteHeader() {
  const t = useTranslations("Layout");
  const tNav = useTranslations("Navigation");
  const locale = useLocale();
  const { phone } = siteConfig.contact;

  const links = primaryNavigation.map((key) => ({
    key,
    hash: navHash(key, locale),
    label: tNav(key),
  }));
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

        <nav aria-label={t("primaryNavLabel")} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8">
            {links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.hash ? { pathname: "/", hash: link.hash } : "/"}
                  className="relative inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors duration-200 ease-standard after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:ease-standard hover:text-ink hover:after:scale-x-100 group-data-overlay/header:text-on-graphite group-data-overlay/header:hover:text-on-graphite"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-4 sm:gap-6 lg:ml-0">
          <a
            href={phoneLink.href}
            aria-label={phoneLink.label}
            className="hidden text-sm font-medium text-ink-muted tabular-nums transition-colors duration-200 ease-standard hover:text-ink sm:inline lg:hidden xl:inline group-data-overlay/header:text-on-graphite group-data-overlay/header:hover:text-on-graphite"
          >
            {phone.display}
          </a>
          <span
            aria-hidden="true"
            className="hidden h-5 w-px bg-line lg:block group-data-overlay/header:bg-on-graphite/30"
          />
          <LocaleSwitcher />
          <MobileNav
            links={links}
            phone={phoneLink}
            labels={{ open: t("menuOpen"), close: t("menuClose"), dialog: t("menuLabel") }}
            brand={<BrandMark />}
          />
        </div>
      </Container>
    </HeaderFrame>
  );
}
