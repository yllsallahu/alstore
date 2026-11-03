import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { revealItem } from "@/components/ui/reveal-classes";
import { documentTitle } from "@/features/catalog/document-copy";
import { documentsForSeries } from "@/features/catalog/documents";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { formatDuration, technicalFilms } from "../films";
import { FilmPlayer } from "./film-player";

const linkClass =
  "group inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent";

/**
 * Films page body: one chapter per series, alternating sides. Each chapter links to the
 * verified documents that name the same series, so the film and the evidence sit together.
 */
export async function FilmChapters() {
  const t = await getTranslations("Films");
  const tDocuments = await getTranslations("Documents");

  return (
    <div className="flex flex-col">
      {technicalFilms.map((film, index) => {
        const name = t(`items.${film.key}.name`);
        const duration = formatDuration(film.durationSeconds);
        const documents = documentsForSeries(film.series);
        const isPortrait = film.orientation === "portrait";
        const flip = index % 2 === 1;

        return (
          <article
            key={film.key}
            id={film.key}
            aria-labelledby={`${film.key}-title`}
            className="scroll-mt-24 border-t border-line first:border-t-0"
          >
            <Container className="py-section">
              <Reveal className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
                <div
                  className={cx(
                    "relative overflow-hidden bg-graphite",
                    isPortrait
                      ? "mx-auto aspect-9/14 w-full max-w-sm lg:col-span-5 lg:max-w-none"
                      : "aspect-video lg:col-span-8",
                    flip && "lg:order-last",
                    revealItem,
                  )}
                >
                  <FilmPlayer
                    film={film}
                    playLabel={t("playLabel", { name, duration })}
                    sizes={
                      isPortrait
                        ? "(min-width: 64rem) 34rem, 24rem"
                        : "(min-width: 64rem) 56rem, 100vw"
                    }
                  />
                </div>

                <div
                  className={cx(
                    isPortrait ? "lg:col-span-7" : "lg:col-span-4",
                    revealItem,
                    "delay-150",
                  )}
                >
                  <p className="text-sm text-accent-ink tabular-nums">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(technicalFilms.length).padStart(2, "0")}
                  </p>
                  <Eyebrow className="mt-6">{t(`items.${film.key}.category`)}</Eyebrow>
                  <h2
                    id={`${film.key}-title`}
                    className="mt-5 text-statement font-light text-balance tabular-nums font-stretch-semi-expanded"
                  >
                    {name}
                  </h2>
                  <p className="mt-6 max-w-sm text-lg text-pretty text-ink-muted">
                    {t(`items.${film.key}.description`)}
                  </p>

                  <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-5 text-sm">
                    <div>
                      <dt className="text-xs text-ink-muted">{t("durationLabel")}</dt>
                      <dd className="mt-1 tabular-nums">{duration}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">{t("sourceLabel")}</dt>
                      <dd className="mt-1">{t("source")}</dd>
                    </div>
                  </dl>

                  {documents.length > 0 ? (
                    <div className="mt-8">
                      <p className="text-xs font-semibold tracking-label text-ink-muted uppercase">
                        {t("documentsHeading")}
                      </p>
                      <ul className="mt-2 flex flex-col">
                        {documents.map((document) => (
                          <li key={document.id}>
                            <Link
                              href={{ pathname: "/documents", hash: document.id }}
                              className={cx(linkClass, "tabular-nums")}
                            >
                              {documentTitle(tDocuments, document.id)}
                              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Reveal>
            </Container>
          </article>
        );
      })}
    </div>
  );
}
