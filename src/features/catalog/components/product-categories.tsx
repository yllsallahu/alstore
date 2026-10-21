"use client";
// Client Component: an IntersectionObserver reveals the timeline on scroll.

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { navHash } from "@/config/navigation";
import { cx } from "@/lib/cx";

/**
 * EVEREST (the manufacturer, not AL STORE) milestones, paraphrased from everest.al.
 * No verified EVEREST production photo exists yet; add one here when supplied.
 */
const milestones = [
  { year: "1997", key: "founded", highlight: false },
  { year: "2000", key: "aluminiumMarket", highlight: false },
  { year: "2005", key: "profiles", highlight: true },
  { year: "2018", key: "upvc", highlight: true },
] as const;

const delays = ["delay-0", "delay-75", "delay-150", "delay-200"] as const;

export function ProductCategories() {
  const t = useTranslations("ProductCategories");
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const reveal = (index: number) =>
    cx(
      "transition duration-300 ease-standard motion-reduce:transition-none",
      delays[index],
      visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
    );

  return (
    <section
      ref={ref}
      id={navHash("products", locale)}
      aria-labelledby="everest-history"
      className="border-b border-line"
    >
      <Container className="grid gap-10 py-16 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-24">
        <div className={cx("lg:col-span-5", reveal(0))}>
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
          {milestones.map(({ year, key, highlight }, index) => (
            <li
              key={year}
              className={cx(
                "flex items-baseline gap-6 border-t border-line py-5 last:border-b sm:gap-10",
                reveal(index),
              )}
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
