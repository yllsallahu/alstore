import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { revealItem } from "@/components/ui/reveal-classes";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { listStoryMilestones } from "../company-story";

/**
 * Company story, 2018 to today: dated AL STORE and EVEREST milestones, each EVEREST row
 * linked to the verified document behind it. Data: ../company-story.ts.
 */
export async function CompanyTimeline() {
  const t = await getTranslations("CompanyStory");
  const milestones = listStoryMilestones();
  const actorName = { alstore: siteConfig.name, everest: siteConfig.manufacturer.name };

  return (
    <section aria-labelledby="company-story" className="py-section">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="company-story"
              className="mt-5 text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("title")}
            </h2>
          </div>
        </div>

        <div className="lg:col-span-8">
          <ol className="border-t border-line">
            {milestones.map(({ key, actor, year, documentId }) => {
              const isStore = actor === "alstore";
              return (
                <li key={key} className="border-b border-line">
                  <Reveal className="grid gap-2 py-6 sm:grid-cols-12 sm:gap-6">
                    <div className={cx("sm:col-span-3", revealItem)}>
                      <p
                        className={cx(
                          "text-2xl font-light tabular-nums font-stretch-semi-expanded",
                          isStore ? "text-brand" : "text-ink",
                        )}
                      >
                        {year === "today" ? t("today") : year}
                      </p>
                      <p
                        className={cx(
                          "mt-1 text-xs font-medium tracking-label uppercase",
                          isStore ? "text-brand" : "text-accent-ink",
                        )}
                      >
                        {actorName[actor]}
                      </p>
                    </div>
                    <div
                      className={cx(
                        "flex flex-col gap-2 sm:col-span-9 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
                        revealItem,
                        "delay-150",
                      )}
                    >
                      <p className={cx("max-w-measure text-pretty", isStore && "text-brand")}>
                        {t(`milestones.${key}`)}
                      </p>
                      {documentId ? (
                        <Link
                          href={{ pathname: "/documents", hash: documentId }}
                          className="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm text-ink-muted transition-colors duration-200 ease-standard hover:text-ink sm:min-h-0"
                        >
                          {t("documentLink")}
                          <span className="sr-only">: {t(`milestones.${key}`)}</span>
                          <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
                        </Link>
                      ) : null}
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 max-w-measure text-xs text-pretty text-ink-muted">{t("footnote")}</p>
        </div>
      </Container>
    </section>
  );
}
