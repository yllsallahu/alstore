import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon, ExternalIcon } from "@/components/ui/icons";
import { type LinkHref, navHref } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

const linkClass =
  "inline-flex min-h-9 items-center text-on-graphite-muted transition-colors duration-200 ease-standard hover:text-on-graphite";
const headingClass = "text-xs font-medium uppercase tracking-label text-on-graphite-muted";

/**
 * Site footer: a closing statement with the two direct actions, then the site map in two groups,
 * the verified address and contact details, and a bottom bar with credits and a back-to-top link.
 */
export function SiteFooter() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Navigation");
  const tLayout = useTranslations("Layout");
  const locale = useLocale();
  const { contact, address, manufacturer } = siteConfig;
  const manufacturerHost = new URL(manufacturer.url).hostname;
  const everest = (chunks: ReactNode) => <span className="text-everest">{chunks}</span>;

  const groups: { id: string; heading: string; links: { href: LinkHref; label: string }[] }[] = [
    {
      id: "footer-systems",
      heading: t("systemsHeading"),
      links: [
        { href: navHref("systems", locale), label: tNav("systems") },
        { href: "/systems/compare", label: t("compareLink") },
        { href: "/films", label: tNav("films") },
        { href: "/documents", label: tNav("documents") },
        { href: "/knowledge", label: tNav("knowledge") },
      ],
    },
    {
      id: "footer-company",
      heading: t("companyHeading"),
      links: [
        { href: "/about", label: tNav("about") },
        { href: navHref("contact", locale), label: tNav("contact") },
      ],
    },
  ];

  return (
    <footer className="bg-graphite text-on-graphite">
      <Container className="pt-section">
        <div className="grid gap-10 border-b border-line-inverse pb-14 md:grid-cols-12 md:items-end md:gap-8">
          <div className="md:col-span-8">
            {/* The supplied wordmark is dark; a filter renders it white (no inverse file yet). */}
            <BrandMark className="brightness-0 invert" />
            <p className="mt-10 max-w-headline text-statement font-light text-balance font-stretch-semi-expanded">
              {t.rich("tagline", { everest })}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-4 md:flex-col md:items-stretch lg:flex-row lg:justify-end">
            <Link href={navHref("contact", locale)} className={buttonClasses("primaryInverse")}>
              {tLayout("quoteAction")}
              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover/button:translate-x-1" />
            </Link>
            <a
              href={`tel:${contact.phone.e164}`}
              aria-label={tLayout("callLabel", { phone: contact.phone.display })}
              className={buttonClasses("secondaryInverse", "tabular-nums")}
            >
              {contact.phone.display}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:grid-cols-12 md:gap-8">
          {groups.map((group) => (
            <nav key={group.id} aria-labelledby={group.id} className="md:col-span-3">
              <h2 id={group.id} className={headingClass}>
                {group.heading}
              </h2>
              <ul className="mt-5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 sm:col-span-1 md:col-span-3">
            <h2 className={headingClass}>{t("addressHeading")}</h2>
            <address className="mt-5 leading-relaxed not-italic">
              <a
                href={address.mapUrl}
                target="_blank"
                rel="noopener"
                className="text-on-graphite-muted transition-colors duration-200 ease-standard hover:text-on-graphite"
              >
                {address.street}
                <br />
                {address.locality} {address.postalCode}
                <br />
                {t("country")}
                <span className="sr-only">: {t("mapLink")}</span>
                <ExternalIcon className="ml-1.5 inline size-3.5 align-baseline" />
              </a>
            </address>
          </div>

          <div className="col-span-2 sm:col-span-1 md:col-span-3">
            <h2 className={headingClass}>{t("contactHeading")}</h2>
            <ul className="mt-5">
              <li>
                <a href={`tel:${contact.phone.e164}`} className={`${linkClass} tabular-nums`}>
                  {contact.phone.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} className={`${linkClass} break-words`}>
                  {contact.email}
                </a>
              </li>
              <li>
                <a href={manufacturer.url} className={linkClass}>
                  {t("manufacturerLabel")}: {manufacturerHost}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-line-inverse">
        <Container className="flex flex-col gap-4 py-6 text-xs text-on-graphite-muted md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="shrink-0">{t("copyright", { year: new Date().getFullYear() })}</p>
          <p className="max-w-xl text-pretty md:text-center">{t("photoCredit")}</p>
          <a
            href="#main"
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 transition-colors duration-200 ease-standard hover:text-on-graphite"
          >
            {t("backToTop")}
            <ArrowRightIcon className="size-4 -rotate-90 transition-transform duration-300 ease-standard group-hover:-translate-y-0.5" />
          </a>
        </Container>
      </div>
    </footer>
  );
}
