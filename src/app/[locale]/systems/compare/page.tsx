import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { SystemCompare } from "@/features/catalog/components/system-compare";
import { keepSeriesTogether, resolveSpecTable } from "@/features/catalog/spec-copy";
import { comparableSystems, systemSlug } from "@/features/catalog/system-specs";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/systems/compare">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "SystemCompare" });

  return buildPageMetadata({
    locale,
    href: "/systems/compare",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Side-by-side comparison of the comparable EVEREST systems. One indexable URL: the
 * selection lives in the query string, which the canonical leaves out. The first pair is
 * server-rendered, so the page has real content without JavaScript.
 */
export default async function ComparePage({ params }: PageProps<"/[locale]/systems/compare">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("SystemCompare");
  const tSystems = await getTranslations("Systems");
  const tSpecs = await getTranslations("SystemSpecs");
  const tPage = await getTranslations("SystemPage");
  const table = await resolveSpecTable(comparableSystems);

  const systems = comparableSystems.map((key) => ({
    key,
    name: keepSeriesTogether(tSystems(`items.${key}.name`)),
    category: tSystems(`items.${key}.category`),
    slug: systemSlug(key),
  }));

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} lead={t("intro")} video="facade30000" />
      <Container className="pb-section">
        <div className="pt-section">
          <SystemCompare
            systems={systems}
            rows={table.rows}
            labels={{
              first: t("firstLabel"),
              second: t("secondLabel"),
              onlyDifferences: t("onlyDifferences"),
              caption: t("tableCaption", { first: "{first}", second: "{second}" }),
              specHeader: t("specHeader"),
              differs: t("differs"),
              viewPage: t("viewPage"),
              sameSelection: t("sameSelection"),
              noDifferences: t("noDifferences"),
              notDocumented: tSpecs("notDocumented"),
              sourceLabel: tSpecs("sourceLabel"),
            }}
          />
        </div>

        <p className="mt-6 max-w-measure text-sm text-pretty text-ink-muted">{t("legend")}</p>
        <p className="mt-2 max-w-measure text-sm text-pretty text-ink-muted">
          {tSpecs("sampleNote")}
        </p>

        <JsonLd
          data={breadcrumbJsonLd(locale, [
            { name: tPage("breadcrumbHome"), href: "/" },
            { name: t("metaTitle"), href: "/systems/compare" },
          ])}
        />
      </Container>
    </>
  );
}
