import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon, ExternalIcon } from "@/components/ui/icons";
import { navHash } from "@/config/navigation";
import { siteConfig } from "@/config/site";

import { SystemsSection } from "@/features/catalog/components/systems-section";
import { CompanyStory } from "@/features/home/components/company-story";
import { TruckScrollHero } from "@/features/home/components/truck-scroll-hero";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localBusinessJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";

const heroFactLabel = "text-xs font-semibold uppercase tracking-label text-on-graphite-muted";
const heroFactLink =
  "inline-flex min-h-11 items-center gap-2 underline decoration-on-graphite/40 underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "HomePage" });

  return buildPageMetadata({
    locale,
    href: "/",
    title: t("metaTitle"),
    description: t("metaDescription"),
    absoluteTitle: true,
  });
}

/**
 * Home page: hero, EVEREST history, EVEREST systems and direct contact actions.
 * Category pages and the quotation flow come in later phases.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("HomePage");
  const tFooter = await getTranslations("Footer");
  const tMeta = await getTranslations("Metadata");
  const { phone, email } = siteConfig.contact;
  const { address, manufacturer } = siteConfig;
  const everest = (chunks: ReactNode) => <span className="text-everest">{chunks}</span>;

  return (
    <>
      {/* Pulled up under the sticky header (h-16 / sm:h-20) so the video fills the whole screen. */}
      <section
        aria-labelledby="home-hero"
        className="relative isolate -mt-16 flex min-h-dvh items-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Image
            src="/media/hero-video-poster.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 size-full object-cover motion-reduce:hidden"
          >
            <source src="/media/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Never lighter than graphite/60 (header legibility); deepens towards the copy. */}
          <div className="absolute inset-0 bg-linear-to-t from-graphite/90 via-graphite/70 to-graphite/60" />
        </div>

        <Container className="w-full pt-28 pb-8 sm:pt-32 sm:pb-12 lg:pb-16">
          <div className="max-w-5xl">
            <Eyebrow tone="graphite" className="animate-rise motion-reduce:animate-none">
              {t.rich("eyebrow", { everest })}
            </Eyebrow>
            <h1
              id="home-hero"
              className="mt-6 text-display font-semibold text-balance font-stretch-semi-expanded animate-rise-2 motion-reduce:animate-none sm:mt-8"
            >
              {t.rich("title", { everest })}
            </h1>
            <div className="mt-10 flex flex-col gap-3 animate-rise-3 motion-reduce:animate-none sm:flex-row">
              <Link
                href={{ pathname: "/", hash: navHash("systems", locale) }}
                className={buttonClasses("primaryInverse")}
              >
                {t("systemsAction")}
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link
                href={{ pathname: "/", hash: navHash("contact", locale) }}
                className={buttonClasses("secondaryInverse")}
              >
                {t("quoteAction")}
              </Link>
            </div>
          </div>

          <dl
            aria-label={t("factsLabel")}
            className="mt-10 grid grid-cols-2 gap-6 border-t border-on-graphite/20 pt-6 animate-rise-4 motion-reduce:animate-none sm:mt-14 sm:grid-cols-3 sm:gap-8 lg:mt-20"
          >
            <div>
              <dt className={heroFactLabel}>{tFooter("manufacturerLabel")}</dt>
              <dd className="mt-1">
                <a href={manufacturer.url} className={heroFactLink}>
                  {new URL(manufacturer.url).hostname}
                  <ExternalIcon className="size-4" />
                </a>
              </dd>
            </div>
            <div>
              <dt className={heroFactLabel}>{tFooter("phoneLabel")}</dt>
              <dd className="mt-1">
                <a href={`tel:${phone.e164}`} className={`${heroFactLink} tabular-nums`}>
                  {phone.display}
                </a>
              </dd>
            </div>
            <div className="hidden sm:block">
              <dt className={heroFactLabel}>{tFooter("addressHeading")}</dt>
              <dd className="mt-1">
                <a href={address.mapUrl} target="_blank" rel="noopener" className={heroFactLink}>
                  {address.locality}, {tFooter("country")}
                  <span className="sr-only">: {tFooter("mapLink")}</span>
                  <ExternalIcon className="size-4" />
                </a>
              </dd>
            </div>
          </dl>
        </Container>
      </section>

      <CompanyStory />

      <SystemsSection />

      <TruckScrollHero />

      <section aria-labelledby="home-contact" className="bg-paper-sunken">
        <Container className="grid gap-10 py-12 md:grid-cols-12 md:gap-8 md:py-16 lg:gap-16">
          <div className="flex flex-col md:col-span-5">
            <h2 id="home-contact" className="text-2xl font-semibold font-stretch-semi-expanded">
              {t("contactHeading")}
            </h2>
            <address className="mt-6 not-italic">
              <a
                href={address.mapUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-start gap-2 text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent"
              >
                <span>
                  {address.street}, {address.locality} {address.postalCode}, {tFooter("country")}
                  <span className="sr-only">: {tFooter("mapLink")}</span>
                </span>
                <ExternalIcon className="mt-1 size-4 shrink-0" />
              </a>
            </address>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-auto md:flex-col lg:flex-row">
              <a href={`tel:${phone.e164}`} className={buttonClasses("primary")}>
                {t("callAction")}
                <span className="tabular-nums">{phone.display}</span>
              </a>
              <a href={`mailto:${email}`} className={buttonClasses("secondary")}>
                {t("emailAction")}
              </a>
            </div>
          </div>
          <iframe
            src={address.mapEmbedUrl}
            title={t("mapTitle")}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-80 w-full border border-line md:col-span-7 md:h-96"
          />
        </Container>
      </section>

      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd
        data={localBusinessJsonLd({
          locale,
          description: tMeta("defaultDescription"),
          countryName: tFooter("country"),
        })}
      />
    </>
  );
}
