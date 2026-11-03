import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealImage, revealItem } from "@/components/ui/reveal-classes";
import { DocumentLibrary } from "@/features/catalog/components/document-library";
import { documentCovers } from "@/features/catalog/document-covers";
import { documentKinds, kindMessageKey } from "@/features/catalog/documents";
import { listTechnicalDocuments } from "@/features/catalog/queries";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cx } from "@/lib/cx";

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

const readingNotes = ["sample", "complete", "official", "manufacturer"] as const;

/** Covers fanned in the hero: a test report, an EPD and the ASI certificate. */
const heroCovers = [
  { id: "asi554", className: "left-1/3 -rotate-6" },
  { id: "epd26335", className: "left-2/3 rotate-6" },
  { id: "rp2147", className: "left-1/2" },
] as const;

/**
 * Technical Resources hub: a dark header with real document covers, the filterable library
 * (each document opens with its facts and full preview), then a band on how to read them.
 * Categories and systems are in-page sections, not separate URLs.
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

  const issuers = new Set(documents.map((document) => document.issuer)).size;

  return (
    <>
      {/* Pulled up under the sticky header (h-16 / sm:h-20), which turns transparent here. */}
      <section
        aria-labelledby="page-title"
        className="relative isolate -mt-16 flex min-h-svh flex-col justify-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20"
      >
        <Container className="grid w-full gap-16 pt-32 pb-section lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
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
            <p className="mt-10 border-t border-on-graphite/20 pt-6 text-sm text-on-graphite-muted tabular-nums animate-rise-4 motion-reduce:animate-none">
              {t("summary", { documents: documents.length, issuers })}
            </p>
          </div>

          {/* Three real first pages, fanned like papers on a desk. Decorative: the library lists them. */}
          <div
            aria-hidden="true"
            className="relative mx-auto h-96 w-full max-w-lg animate-rise-3 motion-reduce:animate-none sm:h-preview lg:col-span-6"
          >
            {heroCovers.map(({ id, className }) => (
              <Image
                key={id}
                src={documentCovers[id]}
                alt=""
                priority
                placeholder="blur"
                sizes="(min-width: 64rem) 20rem, 50vw"
                className={cx(
                  "absolute top-1/2 h-auto w-1/2 -translate-x-1/2 -translate-y-1/2 border border-line-inverse",
                  className,
                )}
              />
            ))}
          </div>
        </Container>
      </section>

      <DocumentLibrary documents={documents} />

      <section aria-labelledby="resource-reading" className="bg-graphite text-on-graphite">
        <Reveal className="grid lg:grid-cols-12">
          <div className="relative aspect-4/3 overflow-hidden bg-ink lg:col-span-5 lg:aspect-auto">
            <Photo
              name="profileGasket"
              sizes="(min-width: 64rem) 42vw, 100vw"
              className={revealImage}
            />
          </div>
          <div className="px-gutter py-section lg:col-span-7 lg:px-16 xl:px-24">
            <Eyebrow tone="graphite" className={revealItem}>
              {t("categoriesHeading")}
            </Eyebrow>
            <h2
              id="resource-reading"
              className={cx(
                "mt-5 text-statement font-light text-balance font-stretch-semi-expanded",
                revealItem,
                "delay-150",
              )}
            >
              {t("readingHeading")}
            </h2>

            <dl className="mt-10 grid gap-x-10 border-t border-line-inverse sm:grid-cols-2">
              {categories.map(({ kind, count }) => (
                <div key={kind} className="border-b border-line-inverse py-5">
                  <dt className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">
                      {t(`categories.${kindMessageKey[kind]}.title`)}
                    </span>
                    <span className="text-xs text-on-graphite-muted tabular-nums">
                      {t("count", { count })}
                    </span>
                  </dt>
                  <dd className="mt-2 text-sm text-pretty text-on-graphite-muted">
                    {t(`categories.${kindMessageKey[kind]}.description`)}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="mt-10 flex flex-col gap-4 border-l border-accent pl-5">
              {readingNotes.map((note) => (
                <li key={note} className="max-w-measure text-sm text-pretty text-on-graphite/85">
                  {t(`reading.${note}`)}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>
    </>
  );
}
