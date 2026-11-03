import { getTranslations } from "next-intl/server";
import { AmbientVideo } from "@/components/ui/ambient-video";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealImage, revealItem } from "@/components/ui/reveal-classes";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

/** Classes from IRCCOS report 1994-CPR-RP2147 (70 000 sample). Same values as Documents.items. */
const results = ["air", "water", "wind"] as const;

/**
 * Dark engineering band: a looping profile cutaway from EVEREST's own technical video and the
 * three classes measured on one tested window sample, with the sample limit stated.
 */
export async function EngineeringBand() {
  const t = await getTranslations("HomePage.engineering");

  return (
    <section aria-labelledby="engineering" className="bg-graphite text-on-graphite">
      <Reveal>
        <div className="grid lg:grid-cols-2">
          <div className="relative aspect-4/3 overflow-hidden bg-ink lg:aspect-auto lg:min-h-fold">
            <AmbientVideo
              name="profile91000"
              sizes="(min-width: 64rem) 50vw, 100vw"
              className={revealImage}
            />
          </div>

          <div className="flex flex-col justify-center px-gutter py-section lg:px-16 xl:px-24">
            <Eyebrow tone="graphite" className={revealItem}>
              {t("eyebrow")}
            </Eyebrow>
            <h2
              id="engineering"
              className={cx(
                "mt-6 text-statement font-light text-balance font-stretch-semi-expanded",
                revealItem,
                "delay-150",
              )}
            >
              {t("title")}
            </h2>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line-inverse pt-8">
              {results.map((key, index) => (
                <div key={key} className={cx("flex flex-col", revealItem, revealDelays[index + 1])}>
                  <dt className="text-xs text-on-graphite-muted">{t(`results.${key}.label`)}</dt>
                  <dd className="mt-auto pt-2 text-2xl font-light tabular-nums font-stretch-semi-expanded">
                    {t(`results.${key}.value`)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-sm text-xs text-pretty text-on-graphite-muted">{t("note")}</p>

            <Link
              href={{ pathname: "/documents", hash: "rp2147" }}
              className="group mt-10 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium"
            >
              {t("action")}
              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
