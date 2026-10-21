import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { siteConfig } from "@/config/site";
import { ProductCategories } from "@/features/catalog/components/product-categories";
import { TruckScrollHero } from "@/features/home/components/truck-scroll-hero";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { localBusinessJsonLd } from "@/lib/seo/structured-data";

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
 * Home page: hero, product category entry points and direct contact actions.
 * Category pages, systems and the quotation flow come in later phases.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("HomePage");
  const tFooter = await getTranslations("Footer");
  const { phone, email } = siteConfig.contact;
  const everest = (chunks: ReactNode) => <span className="text-everest">{chunks}</span>;

  return (
    <>
      {/* Pulled up under the sticky header (h-16 / sm:h-20) so the video fills the whole screen. */}
      <section className="relative isolate -mt-16 flex min-h-dvh items-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20">
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
          <div className="absolute inset-0 bg-graphite/60" />
        </div>

        <Container className="w-full pt-32 pb-section">
          <Eyebrow tone="graphite">{t.rich("eyebrow", { everest })}</Eyebrow>
          <h1 className="mt-8 max-w-5xl text-display font-semibold text-balance font-stretch-semi-expanded">
            {t.rich("title", { everest })}
          </h1>
        </Container>
      </section>

      <ProductCategories />

      <TruckScrollHero />

      <section aria-labelledby="home-contact" className="bg-paper-sunken">
        <Container className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between md:py-16">
          <h2 id="home-contact" className="text-2xl font-semibold font-stretch-semi-expanded">
            {t("contactHeading")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={`tel:${phone.e164}`} className={buttonClasses("primary")}>
              {t("callAction")}
              <span className="tabular-nums">{phone.display}</span>
            </a>
            <a href={`mailto:${email}`} className={buttonClasses("secondary")}>
              {t("emailAction")}
            </a>
          </div>
        </Container>
      </section>

      <JsonLd
        data={localBusinessJsonLd({
          locale,
          description: t("metaDescription"),
          countryName: tFooter("country"),
        })}
      />
    </>
  );
}
