import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClosingCta } from "@/components/layout/closing-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { AmbientVideo } from "@/components/ui/ambient-video";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FilmChapters } from "@/features/films/components/film-chapters";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/films">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Films" });

  return buildPageMetadata({
    locale,
    href: "/films",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** EVEREST technical films, one chapter per series, under a full-width moving header. */
export default async function FilmsPage({ params }: PageProps<"/[locale]/films">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("Films");
  const tPage = await getTranslations("SystemPage");

  return (
    <>
      {/* Pulled up under the sticky header (h-16 / sm:h-20), which turns transparent here. */}
      <section
        aria-labelledby="page-title"
        className="relative isolate -mt-16 flex min-h-svh items-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20"
      >
        <div className="absolute inset-0 -z-10">
          <AmbientVideo
            name="villa93000"
            priority
            sizes="100vw"
            className="animate-settle motion-reduce:animate-none"
          />
          {/* Functional scrim for the copy. */}
          <div className="absolute inset-0 bg-linear-to-t from-graphite/90 via-graphite/35 to-graphite/55" />
        </div>
        <Container className="w-full pt-40 pb-section">
          <Eyebrow tone="graphite" className="animate-rise motion-reduce:animate-none">
            {t("eyebrow")}
          </Eyebrow>
          <h1
            id="page-title"
            className="mt-6 max-w-headline text-display font-light text-balance font-stretch-semi-expanded animate-rise-2 motion-reduce:animate-none"
          >
            {t("title")}
          </h1>
          <p className="mt-8 max-w-md text-lg text-pretty text-on-graphite/85 animate-rise-3 motion-reduce:animate-none">
            {t("intro")}
          </p>
        </Container>
      </section>

      <FilmChapters />

      <Container>
        <p className="border-t border-line py-8 text-xs text-pretty text-ink-muted">{t("note")}</p>
      </Container>

      <ClosingCta />

      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: tPage("breadcrumbHome"), href: "/" },
          { name: t("metaTitle"), href: "/films" },
        ])}
      />
    </>
  );
}
