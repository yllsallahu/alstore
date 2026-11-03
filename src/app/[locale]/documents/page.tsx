import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DocumentViewer } from "@/features/catalog/components/document-viewer";
import { documentKinds, kindMessageKey } from "@/features/catalog/documents";
import { listTechnicalDocuments } from "@/features/catalog/queries";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/documents">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "TechnicalResources" });

  return buildPageMetadata({
    locale,
    href: "/documents",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const readingNotes = ["sample", "complete", "official"] as const;

/**
 * Technical Resources hub: the one indexable resource page. Categories and systems are
 * in-page sections, not separate URLs, because none has enough content of its own yet.
 */
export default async function DocumentsPage({ params }: PageProps<"/[locale]/documents">) {
  await resolveLocale(params);
  const t = await getTranslations("TechnicalResources");
  const documents = listTechnicalDocuments();
  // Categories without a verified document (catalogues, drawings, …) are not shown.
  const categories = documentKinds
    .map((kind) => ({
      kind,
      count: documents.filter((document) => document.kind === kind).length,
    }))
    .filter((category) => category.count > 0);

  return (
    <Container className="py-section">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-6 max-w-measure text-3xl font-semibold text-balance font-stretch-semi-expanded">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-measure text-pretty text-ink-muted">{t("intro")}</p>

      <div className="mt-16 grid gap-12 md:grid-cols-12 md:gap-16">
        <section aria-labelledby="resource-categories" className="md:col-span-7">
          <h2
            id="resource-categories"
            className="text-xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("categoriesHeading")}
          </h2>
          <dl className="mt-6 border-t border-line">
            {categories.map(({ kind, count }) => (
              <div key={kind} className="border-b border-line py-4">
                <dt className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-semibold">
                    {t(`categories.${kindMessageKey[kind]}.title`)}
                  </span>
                  <span className="text-sm text-ink-muted tabular-nums">
                    {t("count", { count })}
                  </span>
                </dt>
                <dd className="mt-2 text-sm text-pretty text-ink-muted">
                  {t(`categories.${kindMessageKey[kind]}.description`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="resource-reading" className="md:col-span-5">
          <h2
            id="resource-reading"
            className="text-xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("readingHeading")}
          </h2>
          <ul className="mt-6 flex flex-col gap-4 border-l-2 border-accent pl-5">
            {readingNotes.map((note) => (
              <li key={note} className="text-sm text-pretty">
                {t(`reading.${note}`)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="resource-browse" className="mt-section">
        <h2
          id="resource-browse"
          className="text-xl font-semibold text-balance font-stretch-semi-expanded"
        >
          {t("browseHeading")}
        </h2>
        <p className="mt-3 max-w-measure text-sm text-pretty text-ink-muted">{t("browseIntro")}</p>
        <DocumentViewer documents={documents} />
      </section>
    </Container>
  );
}
