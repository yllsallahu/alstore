import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon, PlayIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealItem } from "@/components/ui/reveal-classes";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { formatDuration, technicalFilms } from "../films";
import { FilmPlayer } from "./film-player";

/**
 * Homepage band of EVEREST technical films: one featured film that plays in place and the
 * other series as poster tiles that open their chapter on the films page.
 */
export async function FilmsShowcase() {
  const t = await getTranslations("Films");
  const tHome = await getTranslations("HomePage.films");
  const [featured, ...others] = technicalFilms;
  if (!featured) return null;

  const featuredName = t(`items.${featured.key}.name`);
  const featuredDuration = formatDuration(featured.durationSeconds);

  return (
    <section aria-labelledby="home-films" className="bg-graphite text-on-graphite">
      <Container className="py-section">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Eyebrow tone="graphite">{tHome("eyebrow")}</Eyebrow>
            <h2
              id="home-films"
              className="mt-5 text-statement font-light text-balance font-stretch-semi-expanded"
            >
              {tHome("title")}
            </h2>
          </div>
          <Link
            href="/films"
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium md:col-span-4 md:justify-self-end"
          >
            {tHome("allAction")}
            <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
          </Link>
        </div>

        <Reveal className="mt-12 lg:mt-16">
          <div className={cx("relative aspect-video overflow-hidden bg-ink", revealItem)}>
            <FilmPlayer
              film={featured}
              playLabel={t("playLabel", { name: featuredName, duration: featuredDuration })}
              sizes="(min-width: 84rem) 80rem, 100vw"
              caption={
                <span className="flex flex-wrap items-end justify-between gap-4">
                  <span>
                    <span className="block text-xs font-medium tracking-label text-on-graphite/80 uppercase">
                      {t(`items.${featured.key}.category`)}
                    </span>
                    <span className="mt-2 block text-3xl font-light tabular-nums font-stretch-semi-expanded">
                      {featuredName}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums text-on-graphite/80">
                    {featuredDuration}
                  </span>
                </span>
              }
            />
          </div>
          {/* Below `sm` the caption would cover the play button, so it sits under the film. */}
          <p className="mt-4 flex items-baseline justify-between gap-3 sm:hidden">
            <span className="text-2xl font-light tabular-nums font-stretch-semi-expanded">
              {featuredName}
            </span>
            <span className="text-xs tabular-nums text-on-graphite-muted">{featuredDuration}</span>
          </p>

          <ul className="mt-8 grid sm:mt-4 grid-cols-2 gap-4 lg:grid-cols-4">
            {others.map((film, index) => (
              <li key={film.key} className={cx(revealItem, revealDelays[index + 1])}>
                <Link href={{ pathname: "/films", hash: film.key }} className="group block">
                  <span className="relative block aspect-video overflow-hidden bg-ink">
                    <Image
                      src={film.poster.src}
                      alt=""
                      width={film.poster.width}
                      height={film.poster.height}
                      sizes="(min-width: 64rem) 20rem, 50vw"
                      className="size-full object-cover opacity-80 transition duration-1000 ease-out-soft group-hover:scale-105 group-hover:opacity-100 motion-reduce:transition-none"
                    />
                    <span className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-full border border-on-graphite/70 bg-graphite/50 transition-colors duration-300 ease-standard group-hover:bg-on-graphite group-hover:text-ink">
                      <PlayIcon className="size-4 translate-x-px fill-current" />
                    </span>
                  </span>
                  <span className="mt-4 flex items-baseline justify-between gap-3">
                    <span className="text-lg font-light tabular-nums font-stretch-semi-expanded sm:text-xl">
                      {t(`items.${film.key}.name`)}
                    </span>
                    <span className="text-xs tabular-nums text-on-graphite-muted">
                      {formatDuration(film.durationSeconds)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs tracking-label text-on-graphite-muted uppercase">
                    {t(`items.${film.key}.category`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
