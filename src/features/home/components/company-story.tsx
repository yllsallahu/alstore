import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { navHash } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";
import { listStoryMilestones } from "../company-story";

const chain = ["everest", "alstore", "customers"] as const;
const delays = [
  "delay-0",
  "delay-75",
  "delay-100",
  "delay-150",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
] as const;

const revealRow =
  "transition duration-300 ease-standard motion-reduce:transition-none group-data-hidden/reveal:translate-y-2 group-data-hidden/reveal:opacity-0";

/**
 * Homepage company story, 2018 to today: who makes the systems, who supplies them in
 * Kosovo, and the dated milestones behind that. From `lg` the whole story fits one screen:
 * intro and supply chain on the left, the milestone rail on the right. Data: ../company-story.ts.
 */
export async function CompanyStory() {
  const t = await getTranslations("CompanyStory");
  const locale = await getLocale();
  const milestones = listStoryMilestones();
  const actorName = { alstore: siteConfig.name, everest: siteConfig.manufacturer.name };

  return (
    <section
      id={navHash("products", locale)}
      aria-labelledby="company-story"
      className="border-b border-line lg:flex lg:min-h-fold lg:items-center"
    >
      <Container className="grid gap-12 py-section lg:grid-cols-12 lg:gap-16 lg:py-12">
        <div className="flex flex-col lg:col-span-5">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2
            id="company-story"
            className="mt-4 text-3xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("title")}
          </h2>
          <p className="mt-4 max-w-measure text-pretty text-ink-muted">{t("intro")}</p>

          <ol aria-label={t("chainLabel")} className="mt-10 border-b border-line lg:mt-auto">
            {chain.map((step, index) => (
              <li key={step} className="flex gap-6 border-t border-line py-4">
                <div className="w-36 shrink-0">
                  <p className="text-xs font-semibold tracking-label text-ink-muted uppercase tabular-nums">
                    {String(index + 1).padStart(2, "0")} · {t(`chain.${step}.role`)}
                  </p>
                  <p
                    className={cx(
                      "mt-1 font-semibold text-balance font-stretch-semi-expanded",
                      step === "alstore" ? "text-brand" : "text-ink",
                    )}
                  >
                    {t(`chain.${step}.name`)}
                  </p>
                </div>
                <p className="text-sm text-pretty text-ink-muted">{t(`chain.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <Reveal>
            <ol>
              {milestones.map(({ key, actor, year, documentId }, index) => {
                const isStore = actor === "alstore";
                return (
                  <li
                    key={key}
                    className={cx(
                      "group/row flex items-stretch gap-4 sm:gap-6",
                      revealRow,
                      delays[Math.min(index, delays.length - 1)],
                    )}
                  >
                    <div className="flex w-20 shrink-0 flex-col justify-center py-2">
                      <span
                        className={cx(
                          "text-xl font-semibold tabular-nums font-stretch-semi-expanded",
                          isStore ? "text-brand" : "text-ink",
                        )}
                      >
                        {year === "today" ? t("today") : year}
                      </span>
                      <span
                        className={cx(
                          "text-xs font-semibold tracking-label whitespace-nowrap uppercase",
                          isStore ? "text-brand" : "text-accent-ink",
                        )}
                      >
                        {actorName[actor]}
                      </span>
                    </div>

                    <div aria-hidden="true" className="relative flex w-3 shrink-0 justify-center">
                      <span className="absolute inset-y-0 w-px bg-line group-first/row:top-1/2 group-last/row:bottom-1/2" />
                      <span
                        className={cx(
                          "relative my-auto rounded-full border-2 border-paper",
                          isStore ? "size-3.5 bg-brand" : "size-3 bg-accent",
                        )}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1 border-b border-line py-2 group-last/row:border-b-0 sm:flex-row sm:items-center sm:gap-6">
                      <p
                        className={cx(
                          "flex-1 text-sm text-pretty sm:text-base",
                          isStore ? "font-semibold text-brand" : "text-ink",
                        )}
                      >
                        {t(`milestones.${key}`)}
                      </p>
                      {documentId ? (
                        <Link
                          href={{ pathname: "/documents", hash: documentId }}
                          className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:text-ink hover:decoration-accent"
                        >
                          {t("documentLink")}
                          <span className="sr-only">: {t(`milestones.${key}`)}</span>
                          <ArrowRightIcon className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          <p className="mt-6 max-w-measure text-xs text-pretty text-ink-muted">{t("footnote")}</p>
        </div>
      </Container>
    </section>
  );
}
