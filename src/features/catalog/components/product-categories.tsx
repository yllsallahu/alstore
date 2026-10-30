import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { navHash } from "@/config/navigation";
import { cx } from "@/lib/cx";

/**
 * EVEREST (the manufacturer, not AL STORE) milestones, paraphrased from everest.al.
 * Server Component: no client JS. Motion belongs in CSS if reintroduced later.
 */
const milestones = [
  { year: "1997", key: "founded", highlight: false },
  { year: "2000", key: "aluminiumMarket", highlight: false },
  { year: "2005", key: "profiles", highlight: true },
  { year: "2018", key: "upvc", highlight: true },
] as const;

export async function ProductCategories() {
  const t = await getTranslations("ProductCategories");
  const locale = await getLocale();

  return (
    <section
      id={navHash("products", locale)}
      aria-labelledby="everest-history"
      className="border-b border-line"
    >
      <Container className="grid gap-10 py-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24">
        <div className="lg:col-span-5">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2
            id="everest-history"
            className="mt-4 text-3xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("title")}
          </h2>
          <p className="mt-4 max-w-measure text-pretty text-ink-muted">{t("intro")}</p>
        </div>

        <ol className="lg:col-span-7">
          {milestones.map(({ year, key, highlight }) => (
            <li
              key={year}
              className="flex items-baseline gap-6 border-t border-line py-5 last:border-b sm:gap-10"
            >
              <span
                className={cx(
                  "w-20 shrink-0 text-2xl font-semibold tabular-nums font-stretch-semi-expanded",
                  highlight ? "text-brand" : "text-ink-muted",
                )}
              >
                {year}
              </span>
              <span
                className={cx("text-pretty", highlight ? "font-semibold text-brand" : "text-ink")}
              >
                {t(`milestones.${key}`)}
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
