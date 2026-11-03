import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon, DownloadIcon } from "@/components/ui/icons";
import { navHash } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { documentDate, documentTitle } from "../document-copy";
import { documentsForSystem, kindMessageKey } from "../documents";
import { keepSeriesTogether, resolveSpecTable } from "../spec-copy";
import { listSystemPages, type SystemPageKey, systemSlug } from "../system-specs";
import type { EverestSystem } from "../systems";
import { systemProductJsonLd } from "../structured-data";

type SystemDetailProps = {
  system: EverestSystem & { key: SystemPageKey };
};

const linkClass =
  "inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent";

/**
 * System page: EVEREST description and render, documented specifications, the documents
 * behind them, related systems and a quotation request. Nothing here is typed in by hand:
 * values come from system-specs.ts and the document register.
 */
export async function SystemDetail({ system }: SystemDetailProps) {
  const locale = await getLocale();
  const t = await getTranslations("SystemPage");
  const tSystems = await getTranslations("Systems");
  const tSpecs = await getTranslations("SystemSpecs");
  const tDocuments = await getTranslations("Documents");

  const { key, image } = system;
  // Plain name for structured data and the email subject; display copy keeps the series together.
  const plainName = tSystems(`items.${key}.name`);
  const name = keepSeriesTogether(plainName);
  const description = tSystems(`items.${key}.description`);
  const category = tSystems(`items.${key}.category`);
  const title = t("title", { name: plainName });
  const href = { pathname: "/systems/[slug]", params: { slug: systemSlug(key) } } as const;
  const systemsHref = { pathname: "/", hash: navHash("systems", locale) } as const;

  const specs = await resolveSpecTable([key]);
  const documents = documentsForSystem(key);
  const related = listSystemPages().filter((page) => page.key !== key);
  const { phone, email } = siteConfig.contact;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(t("emailSubject", { name: plainName }))}`;

  return (
    <>
      <Container className="py-12 lg:py-16">
        <nav aria-label={t("breadcrumbLabel")}>
          <ol className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            <li>
              <Link href="/" className="hover:text-ink">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={systemsHref} className="hover:text-ink">
                {t("breadcrumbSystems")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink tabular-nums">
              {name}
            </li>
          </ol>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow>{category}</Eyebrow>
            <h1 className="mt-4 text-3xl font-semibold text-balance tabular-nums font-stretch-semi-expanded">
              {keepSeriesTogether(title)}
            </h1>
            <p className="mt-6 max-w-measure text-lg text-pretty">{description}</p>
            <p className="mt-4 max-w-measure text-sm text-pretty text-ink-muted">
              {t("manufacturer")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#inquiry" className={buttonClasses("primary")}>
                {t("quoteAction")}
              </a>
              <Link
                href={{ pathname: "/systems/compare", query: { first: key } }}
                className={buttonClasses("secondary")}
              >
                {t("compareAction")}
              </Link>
            </div>
          </div>

          <figure className="lg:col-span-5">
            <div className="relative aspect-square overflow-hidden border border-line bg-paper-sunken">
              {/* Multiply blends the render's white background into the panel tone. */}
              <Image
                src={image.src}
                alt={tSystems(`items.${key}.alt`)}
                width={image.width}
                height={image.height}
                priority
                sizes="(min-width: 64rem) 32rem, 100vw"
                className="size-full object-contain p-8 mix-blend-multiply"
              />
            </div>
            <figcaption className="mt-3 text-xs text-ink-muted">{t("imageCredit")}</figcaption>
          </figure>
        </div>
      </Container>

      <section aria-labelledby="system-specs" className="border-t border-line">
        <Container className="grid gap-8 py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="lg:col-span-4">
            <h2
              id="system-specs"
              className="text-2xl font-semibold text-balance font-stretch-semi-expanded"
            >
              {t("specsHeading")}
            </h2>
            <p className="mt-4 max-w-measure text-pretty text-ink-muted">{t("specsIntro")}</p>
          </div>

          <div className="lg:col-span-8">
            <dl className="border-t border-line">
              {specs.rows.map(({ row, label, cells }) => {
                const cell = cells[key];
                return (
                  <div
                    key={row}
                    className="grid gap-1 border-b border-line py-4 sm:grid-cols-3 sm:gap-6"
                  >
                    <dt className="text-sm font-semibold text-ink-muted">{label}</dt>
                    <dd className="sm:col-span-2">
                      {cell ? (
                        <>
                          <p className="text-pretty tabular-nums">{cell.text}</p>
                          <p className="mt-1 text-sm text-ink-muted">
                            {tSpecs("sourceLabel")}:{" "}
                            {cell.documentId ? (
                              <Link
                                href={{ pathname: "/documents", hash: cell.documentId }}
                                className="underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-accent"
                              >
                                {cell.source}
                              </Link>
                            ) : (
                              cell.source
                            )}
                          </p>
                        </>
                      ) : (
                        <p className="text-ink-muted">{tSpecs("notDocumented")}</p>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 max-w-measure text-sm text-pretty text-ink-muted">
              {tSpecs("sampleNote")}
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="system-documents" className="border-t border-line bg-paper-sunken">
        <Container className="py-16 lg:py-20">
          <h2
            id="system-documents"
            className="text-2xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("documentsHeading")}
          </h2>
          <p className="mt-4 max-w-measure text-pretty text-ink-muted">{t("documentsIntro")}</p>
          <ul className="mt-8 grid border-t border-l border-line md:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => {
              const file = document.links.find((link) => link.id === "file");
              return (
                <li
                  key={document.id}
                  className="flex flex-col border-r border-b border-line bg-paper p-6"
                >
                  <p className="text-xs font-semibold tracking-label text-accent-ink uppercase">
                    {tDocuments(`kinds.${kindMessageKey[document.kind]}`)}
                  </p>
                  <h3 className="mt-3 font-semibold tabular-nums">
                    {documentTitle(tDocuments, document.id)}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted tabular-nums">
                    {document.issuer}
                    {document.issuedOn ? ` · ${documentDate(tDocuments, document.issuedOn)}` : null}
                  </p>
                  <div className="mt-auto flex flex-col pt-4">
                    <Link
                      href={{ pathname: "/documents", hash: document.id }}
                      className={linkClass}
                    >
                      {t("viewInResources")}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                    {file ? (
                      <a href={file.href} className={linkClass}>
                        {t("openPdf")}
                        <DownloadIcon className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="related-systems" className="border-t border-line">
          <Container className="py-16 lg:py-20">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2
                id="related-systems"
                className="text-2xl font-semibold text-balance font-stretch-semi-expanded"
              >
                {t("relatedHeading")}
              </h2>
              <Link href={systemsHref} className={linkClass}>
                {t("allSystems")}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
            <ul className="mt-8 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-3">
              {related.map((page) => (
                <li key={page.key} className="border-r border-b border-line">
                  <Link
                    href={{ pathname: "/systems/[slug]", params: { slug: page.slug } }}
                    className="group flex h-full items-center gap-6 p-6 transition-colors duration-200 ease-standard hover:bg-paper-sunken"
                  >
                    <Image
                      src={page.image.src}
                      alt=""
                      width={page.image.width}
                      height={page.image.height}
                      sizes="6rem"
                      className="size-24 shrink-0 object-contain mix-blend-multiply"
                    />
                    <span>
                      <span className="block text-xs font-semibold tracking-label text-accent-ink uppercase">
                        {tSystems(`items.${page.key}.category`)}
                      </span>
                      <span className="mt-2 block text-xl font-semibold text-brand tabular-nums font-stretch-semi-expanded">
                        {keepSeriesTogether(tSystems(`items.${page.key}.name`))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section
        id="inquiry"
        aria-labelledby="system-inquiry"
        className="scroll-mt-24 bg-graphite text-on-graphite"
      >
        <Container className="grid gap-8 py-16 md:grid-cols-12 md:items-center lg:py-20">
          <div className="md:col-span-7">
            <h2
              id="system-inquiry"
              className="text-2xl font-semibold text-balance tabular-nums font-stretch-semi-expanded"
            >
              {t("inquiryHeading", { name })}
            </h2>
            <p className="mt-4 max-w-measure text-pretty text-on-graphite-muted">
              {t("inquiryText")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-5 md:justify-end">
            <a href={`tel:${phone.e164}`} className={buttonClasses("primaryInverse")}>
              {t("callAction")}
              <span className="tabular-nums">{phone.display}</span>
            </a>
            <a href={mailto} className={buttonClasses("secondaryInverse")}>
              {t("emailAction")}
            </a>
          </div>
        </Container>
      </section>

      <JsonLd
        data={systemProductJsonLd({
          locale,
          href,
          name: title,
          description,
          category,
          image: image.src,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t("breadcrumbHome"), href: "/" },
          { name: title, href },
        ])}
      />
    </>
  );
}
