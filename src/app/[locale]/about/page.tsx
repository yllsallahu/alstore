import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClosingCta } from "@/components/layout/closing-cta";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { CompanyTimeline } from "@/features/about/components/company-timeline";
import { FilmBand } from "@/features/about/components/film-band";
import { LocationSection } from "@/features/about/components/location-section";
import { SupplyChain } from "@/features/about/components/supply-chain";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "AboutPage" });

  return buildPageMetadata({
    locale,
    href: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** About AL STORE: role in the supply chain, the 2018 – today story and the location. */
export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("AboutPage");
  const tNav = await getTranslations("Navigation");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tNav("home"), href: "/" },
          { name: tNav("about"), href: "/about" },
        ])}
      />
      <PageHero eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} photo="glassPavilion" />
      <SupplyChain />
      <FilmBand />
      <CompanyTimeline />
      <LocationSection />
      <ClosingCta />
    </>
  );
}
