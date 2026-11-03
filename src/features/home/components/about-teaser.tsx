import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealImage, revealItem } from "@/components/ui/reveal-classes";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

/** Short company introduction with one strong image and a link to the About page. */
export async function AboutTeaser() {
  const t = await getTranslations("HomePage.about");

  return (
    <section aria-labelledby="about-teaser" className="py-section">
      <Reveal>
        <Container className="grid gap-12 md:grid-cols-12 md:items-center md:gap-8">
          <div className="relative aspect-4/5 overflow-hidden bg-stone md:col-span-6 lg:col-span-5">
            <Photo
              name="timberFacade"
              sizes="(min-width: 48rem) 45vw, 100vw"
              className={revealImage}
            />
          </div>

          <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
            <Eyebrow className={revealItem}>{t("eyebrow")}</Eyebrow>
            <h2
              id="about-teaser"
              className={cx(
                "mt-6 text-3xl font-light text-balance font-stretch-semi-expanded",
                revealItem,
                "delay-150",
              )}
            >
              {t("title")}
            </h2>
            <p
              className={cx(
                "mt-6 max-w-measure text-lg text-pretty text-ink-muted",
                revealItem,
                "delay-300",
              )}
            >
              {t("lead")}
            </p>

            <dl
              className={cx("mt-10 flex gap-12 border-t border-line pt-6", revealItem, "delay-300")}
            >
              <div>
                <dt className="text-xs text-ink-muted">{t("sinceLabel")}</dt>
                <dd className="mt-1 text-3xl font-light tabular-nums font-stretch-semi-expanded">
                  {siteConfig.distributorSince}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">{t("manufacturerLabel")}</dt>
                <dd className="mt-1 text-3xl font-light font-stretch-semi-expanded">
                  {siteConfig.manufacturer.name}
                </dd>
              </div>
            </dl>

            <Link
              href="/about"
              className="group mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
            >
              {t("action")}
              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
            </Link>
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
