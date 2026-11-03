import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealItem } from "@/components/ui/reveal-classes";
import { navHash } from "@/config/navigation";
import type { PhotoKey } from "@/config/photography";
import { siteConfig } from "@/config/site";
import { FilmPlayer } from "@/features/films/components/film-player";
import { type FilmKey, formatDuration, technicalFilms } from "@/features/films/films";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { documentsForSystem } from "../documents";
import { keepSeriesTogether, resolveSpecTable } from "../spec-copy";
import { isComparable, listSystemPages, type SystemPageKey, systemSlug } from "../system-specs";
import type { EverestSystem } from "../systems";
import { systemProductJsonLd } from "../structured-data";
import { DocumentCard } from "./document-card";

type SystemDetailProps = {
  system: EverestSystem & { key: SystemPageKey };
};

/**
 * What the hero shows: the photograph the EVEREST 2024 catalogue prints on that series' page
 * (CONTENT_SOURCES.md §4), or, where the catalogue has no such page, the series' own EVEREST film.
 */
const heroMedia: Record<SystemPageKey, { photo: PhotoKey } | { film: FilmKey }> = {
  s30000: { film: "s30000" },
  s60000: { photo: "series60000" },
  s70000: { photo: "series70000" },
  s71000: { photo: "series71000" },
  s76000: { photo: "series76000" },
  pvc: { photo: "seriesPvc" },
};

/** EVEREST technical film shown in its own section (when it is not already the hero). */
const sectionFilm: Partial<Record<SystemPageKey, FilmKey>> = { pvc: "pvc85000" };

const linkClass =
  "group inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent";

/**
 * System page: hero with the series photograph or film, the EVEREST description and render,
 * documented specifications (comparable systems) or a plain "not yet documented" note, the
 * series film and documents, related systems and a quotation request. Nothing is typed in by
 * hand: values come from system-specs.ts, the document register and the film register.
 */
export async function SystemDetail({ system }: SystemDetailProps) {
  const locale = await getLocale();
  const t = await getTranslations("SystemPage");
  const tSystems = await getTranslations("Systems");
  const tSpecs = await getTranslations("SystemSpecs");
  const tFilms = await getTranslations("Films");
  const tPhotography = await getTranslations("Photography");

  const { key, image } = system;
  // Plain name for structured data and the email subject; display copy keeps the series together.
  const plainName = tSystems(`items.${key}.name`);
  const name = keepSeriesTogether(plainName);
  const description = tSystems(`items.${key}.description`);
  const category = tSystems(`items.${key}.category`);
  const title = t("title", { name: plainName });
  const href = { pathname: "/systems/[slug]", params: { slug: systemSlug(key) } } as const;
  const systemsHref = { pathname: "/", hash: navHash("systems", locale) } as const;

  const comparable = isComparable(key) ? key : null;
  const specs = comparable ? await resolveSpecTable([comparable]) : null;
  const documents = documentsForSystem(key);
  const related = listSystemPages().filter((page) => page.key !== key);
  const hero = heroMedia[key];
  const heroFilm = "film" in hero ? technicalFilms.find((film) => film.key === hero.film) : null;
  const filmKey = sectionFilm[key];
  const film = filmKey ? technicalFilms.find((candidate) => candidate.key === filmKey) : null;
  const { phone, email } = siteConfig.contact;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(t("emailSubject", { name: plainName }))}`;

  return (
    <>
      {/* Pulled up under the sticky header (h-16 / sm:h-20), which turns transparent here. */}
      <section
        aria-labelledby="page-title"
        className="relative isolate -mt-16 flex min-h-svh flex-col justify-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20"
      >
        <Container className="grid w-full gap-12 pt-28 pb-14 sm:pt-32 lg:grid-cols-12 lg:items-end lg:gap-16 lg:pb-20">
          <nav aria-label={t("breadcrumbLabel")} className="lg:col-span-12">
            <ol className="flex flex-wrap items-center gap-x-2 text-sm text-on-graphite/75">
              <li>
                <Link href="/" className="hover:text-on-graphite">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={systemsHref} className="hover:text-on-graphite">
                  {t("breadcrumbSystems")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-on-graphite tabular-nums">
                {name}
              </li>
            </ol>
          </nav>

          <div className="lg:col-span-6">
            <Eyebrow tone="graphite" className="animate-rise motion-reduce:animate-none">
              {category}
            </Eyebrow>
            <h1
              id="page-title"
              className="mt-6 max-w-headline text-display font-light text-balance tabular-nums font-stretch-semi-expanded animate-rise-2 motion-reduce:animate-none"
            >
              {keepSeriesTogether(title)}
            </h1>
            <div className="mt-10 flex flex-col gap-3 border-t border-on-graphite/20 pt-6 animate-rise-3 motion-reduce:animate-none sm:flex-row">
              <a href="#inquiry" className={buttonClasses("primaryInverse")}>
                {t("quoteAction")}
              </a>
              {comparable ? (
                <Link
                  href={{ pathname: "/systems/compare", query: { first: comparable } }}
                  className={buttonClasses("secondaryInverse")}
                >
                  {t("compareAction")}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Framed rather than full-bleed, so the source is shown at its own sharpness. */}
          <figure className="animate-rise-4 motion-reduce:animate-none lg:col-span-6">
            {heroFilm ? (
              <>
                <div className="relative aspect-video overflow-hidden bg-ink">
                  <FilmPlayer
                    film={heroFilm}
                    playLabel={tFilms("playLabel", {
                      name: tFilms(`items.${heroFilm.key}.name`),
                      duration: formatDuration(heroFilm.durationSeconds),
                    })}
                    sizes="(min-width: 84rem) 40rem, (min-width: 64rem) 50vw, 100vw"
                  />
                </div>
                <figcaption className="mt-3 text-xs text-on-graphite-muted">
                  {t("filmCredit")} · {tFilms(`items.${heroFilm.key}.description`)}
                </figcaption>
              </>
            ) : "photo" in hero ? (
              <>
                <div className="relative aspect-4/3 overflow-hidden bg-ink">
                  <Photo
                    name={hero.photo}
                    priority
                    sizes="(min-width: 84rem) 40rem, (min-width: 64rem) 50vw, 100vw"
                    className="animate-settle motion-reduce:animate-none"
                  />
                </div>
                <figcaption className="mt-3 text-xs text-on-graphite-muted">
                  {tPhotography("credit")}
                </figcaption>
              </>
            ) : null}
          </figure>
        </Container>
      </section>

      <section aria-label={category}>
        <Container className="py-section">
          <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            <figure className={cx("lg:col-span-5", revealItem)}>
              <div className="relative mx-auto aspect-square max-w-md overflow-hidden bg-paper-sunken lg:max-w-none">
                {/* Multiply blends the render's white background into the panel tone. */}
                <Image
                  src={image.src}
                  alt={tSystems(`items.${key}.alt`)}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 64rem) 28rem, 100vw"
                  className="size-full object-contain p-10 mix-blend-multiply"
                />
              </div>
              <figcaption className="mt-3 text-xs text-ink-muted">{t("imageCredit")}</figcaption>
            </figure>
            <div className={cx("lg:col-span-7", revealItem, "delay-150")}>
              <p className="text-statement font-light text-balance font-stretch-semi-expanded">
                {description}
              </p>
              <p className="mt-8 max-w-measure text-pretty text-ink-muted">{t("manufacturer")}</p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section aria-labelledby="system-specs" className="border-t border-line">
        <Container className="grid gap-8 py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
          <div className="lg:col-span-4">
            <h2
              id="system-specs"
              className="text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("specsHeading")}
            </h2>
            {specs ? (
              <p className="mt-4 max-w-measure text-pretty text-ink-muted">{t("specsIntro")}</p>
            ) : null}
          </div>

          <div className="lg:col-span-8">
            {specs && comparable ? (
              <>
                <dl className="border-t border-line">
                  {specs.rows.map(({ row, label, cells }) => {
                    const cell = cells[comparable];
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
              </>
            ) : (
              <div className="border-t border-line pt-6">
                <p className="max-w-measure text-lg text-pretty">
                  {documents.length > 0 ? t("specsInDocuments") : t("pendingText")}
                </p>
                <a
                  href={documents.length > 0 ? "#system-documents" : "#inquiry"}
                  className={cx(buttonClasses("secondary"), "mt-8")}
                >
                  {documents.length > 0 ? t("specsInDocumentsAction") : t("pendingAction")}
                  <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover/button:translate-x-1" />
                </a>
              </div>
            )}
          </div>
        </Container>
      </section>

      {film ? (
        <section aria-labelledby="system-film" className="bg-graphite text-on-graphite">
          <Container className="py-section">
            <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
              <div
                className={cx(
                  "relative overflow-hidden bg-ink",
                  film.orientation === "portrait"
                    ? "mx-auto aspect-9/14 w-full max-w-sm lg:col-span-5 lg:max-w-none"
                    : "aspect-video lg:col-span-8",
                  revealItem,
                )}
              >
                <FilmPlayer
                  film={film}
                  playLabel={tFilms("playLabel", {
                    name: tFilms(`items.${film.key}.name`),
                    duration: formatDuration(film.durationSeconds),
                  })}
                  sizes="(min-width: 64rem) 34rem, 24rem"
                />
              </div>
              <div
                className={cx(
                  film.orientation === "portrait" ? "lg:col-span-7" : "lg:col-span-4",
                  revealItem,
                  "delay-150",
                )}
              >
                <Eyebrow tone="graphite">{t("filmHeading")}</Eyebrow>
                <h2
                  id="system-film"
                  className="mt-5 text-statement font-light text-balance tabular-nums font-stretch-semi-expanded"
                >
                  {tFilms(`items.${film.key}.name`)}
                </h2>
                <p className="mt-6 max-w-sm text-lg text-pretty text-on-graphite/85">
                  {tFilms(`items.${film.key}.description`)}
                </p>
                <p className="mt-4 text-sm text-on-graphite-muted tabular-nums">
                  {t("filmCredit")} · {formatDuration(film.durationSeconds)}
                </p>
                <Link
                  href={{ pathname: "/films", hash: film.key }}
                  className="group mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
                >
                  {t("allFilms")}
                  <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </Container>
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section
          id="system-documents"
          aria-labelledby="system-documents-title"
          className="scroll-mt-24 border-t border-line bg-paper-sunken"
        >
          <Container className="py-16 lg:py-20">
            <h2
              id="system-documents-title"
              className="text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("documentsHeading")}
            </h2>
            <p className="mt-4 max-w-measure text-pretty text-ink-muted">
              {key === "pvc" ? t("documentsIntroCategory") : t("documentsIntro")}
            </p>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
              {documents.map((document) => (
                <li key={document.id}>
                  <DocumentCard document={document} tone="sunken" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="related-systems" className="border-t border-line">
        <Container className="py-section">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2
              id="related-systems"
              className="text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("relatedHeading")}
            </h2>
            <Link href={systemsHref} className={linkClass}>
              {t("allSystems")}
              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
            </Link>
          </div>
          <Reveal className="mt-10">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-5">
              {related.map((page, index) => (
                <li key={page.key} className={cx(revealItem, revealDelays[index % 5])}>
                  <Link
                    href={{ pathname: "/systems/[slug]", params: { slug: page.slug } }}
                    className="group block"
                  >
                    <span className="relative block aspect-square overflow-hidden bg-paper-sunken">
                      <Image
                        src={page.image.src}
                        alt=""
                        width={page.image.width}
                        height={page.image.height}
                        sizes="(min-width: 64rem) 15rem, 50vw"
                        className="size-full object-contain p-6 mix-blend-multiply transition-transform duration-1000 ease-out-soft group-hover:scale-105 motion-reduce:transition-none"
                      />
                    </span>
                    <span className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-lg font-light tabular-nums font-stretch-semi-expanded">
                        {keepSeriesTogether(tSystems(`items.${page.key}.name`))}
                      </span>
                      <ArrowRightIcon className="size-4 shrink-0 text-ink-muted transition duration-300 ease-standard group-hover:translate-x-1 group-hover:text-ink" />
                    </span>
                    <span className="mt-1 block text-xs font-medium tracking-label text-accent-ink uppercase">
                      {tSystems(`items.${page.key}.category`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section
        id="inquiry"
        aria-labelledby="system-inquiry"
        className="scroll-mt-24 bg-graphite text-on-graphite"
      >
        <Container className="grid gap-8 py-16 md:grid-cols-12 md:items-center lg:py-20">
          <div className="md:col-span-7">
            <h2
              id="system-inquiry"
              className="text-3xl font-light text-balance tabular-nums font-stretch-semi-expanded"
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
