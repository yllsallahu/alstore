import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealItem } from "@/components/ui/reveal-classes";
import { cx } from "@/lib/cx";

const chain = ["everest", "alstore", "customers"] as const;

/** Who does what: manufacturer, distributor, customers, as three numbered columns. */
export async function SupplyChain() {
  const t = await getTranslations("CompanyStory");

  return (
    <section aria-labelledby="supply-chain" className="py-section">
      <Container>
        <h2 id="supply-chain" className="sr-only">
          {t("chainLabel")}
        </h2>
        <Reveal>
          <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
            {chain.map((step, index) => (
              <li
                key={step}
                className={cx("border-t border-line pt-6", revealItem, revealDelays[index])}
              >
                <p className="text-xs font-medium tracking-label text-ink-muted uppercase tabular-nums">
                  {String(index + 1).padStart(2, "0")} · {t(`chain.${step}.role`)}
                </p>
                <p
                  className={cx(
                    "mt-6 text-3xl font-light text-balance font-stretch-semi-expanded",
                    step === "alstore" ? "text-brand" : "text-ink",
                  )}
                >
                  {t(`chain.${step}.name`)}
                </p>
                <p className="mt-4 max-w-xs text-pretty text-ink-muted">
                  {t(`chain.${step}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
