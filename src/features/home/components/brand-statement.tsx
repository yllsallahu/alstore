import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealImage, revealItem } from "@/components/ui/reveal-classes";
import { cx } from "@/lib/cx";

/** Typographic brand statement over a wide, cinematic photograph. */
export async function BrandStatement() {
  const t = await getTranslations("HomePage.statement");

  return (
    <section aria-labelledby="brand-statement" className="py-section">
      <Reveal>
        <Container className="grid gap-8 md:grid-cols-12">
          <h2
            id="brand-statement"
            className={cx(
              "text-statement font-light text-balance font-stretch-semi-expanded md:col-span-9",
              revealItem,
            )}
          >
            {t.rich("title", {
              muted: (chunks) => <span className="text-ink-muted">{chunks}</span>,
            })}
          </h2>
          <p
            className={cx(
              "max-w-xs text-pretty text-ink-muted md:col-span-3 md:self-end md:justify-self-end",
              revealItem,
              "delay-150",
            )}
          >
            {t("lead")}
          </p>
        </Container>

        <div className="mt-14 px-gutter sm:mt-20">
          <div className="relative mx-auto aspect-4/3 max-w-wide overflow-hidden bg-stone sm:aspect-21/9">
            <Photo name="livingRoom" sizes="100vw" className={revealImage} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
