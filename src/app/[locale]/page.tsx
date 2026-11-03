import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClosingCta } from "@/components/layout/closing-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { navHash } from "@/config/navigation";
import { SystemsSection } from "@/features/catalog/components/systems-section";
import { AboutTeaser } from "@/features/home/components/about-teaser";
import { BrandStatement } from "@/features/home/components/brand-statement";
import { CollectionShowcase } from "@/features/home/components/collection-showcase";
import { EngineeringBand } from "@/features/home/components/engineering-band";
import { HomeHero } from "@/features/home/components/home-hero";
import { TruckScrollHero } from "@/features/home/components/truck-scroll-hero";
import { FilmsShowcase } from "@/features/films/components/films-showcase";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localBusinessJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";

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
 * Home page, image-led: hero, brand statement, collections, EVEREST systems, engineering,
 * technical films, the partnership truck story, company introduction and the contact close. Long-form content lives on the inner pages.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const tFooter = await getTranslations("Footer");
  const tMeta = await getTranslations("Metadata");

  return (
    <>
      <HomeHero />
      <BrandStatement />
      <CollectionShowcase />
      <SystemsSection />
      <EngineeringBand />
      <FilmsShowcase />
      <TruckScrollHero />
      <AboutTeaser />
      <ClosingCta id={navHash("contact", locale)} />

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
