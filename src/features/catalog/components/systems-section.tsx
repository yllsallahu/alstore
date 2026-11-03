import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealItem } from "@/components/ui/reveal-classes";
import { navHash } from "@/config/navigation";
import { systemSlug } from "@/features/catalog/system-specs";
import { type EverestSystem, everestSystems } from "@/features/catalog/systems";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

/**
 * Homepage "Systems" section: EVEREST aluminium and PVC systems that AL STORE distributes,
 * shown as a product gallery (EVEREST renders, name, category). Descriptions and specs live on
 * the system pages (one per system).
 */
export async function SystemsSection() {
  const t = await getTranslations("Systems");
  const locale = await getLocale();

  return (
    <section
      id={navHash("systems", locale)}
      aria-labelledby="everest-systems"
      className="bg-paper-sunken"
    >
      <Container className="py-section">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="everest-systems"
              className="mt-5 text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("title")}
            </h2>
          </div>
          <p className="max-w-xs text-pretty text-ink-muted md:col-span-4 md:justify-self-end">
            {t("intro")}
          </p>
        </div>

        <Reveal className="mt-12 lg:mt-16">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
            {everestSystems.map((system, index) => (
              <li key={system.key} className={cx(revealItem, revealDelays[index % 3])}>
                <SystemCard system={system} name={t(`items.${system.key}.name`)}>
                  <Image
                    src={system.image.src}
                    alt={t(`items.${system.key}.alt`)}
                    width={system.image.width}
                    height={system.image.height}
                    sizes="(min-width: 64rem) 26rem, 50vw"
                    className="size-full object-contain p-4 mix-blend-multiply sm:p-10 transition-transform duration-1000 ease-out-soft group-hover:scale-105 motion-reduce:transition-none"
                  />
                </SystemCard>
                <p className="mt-2 text-xs font-medium tracking-label text-accent-ink uppercase">
                  {t(`items.${system.key}.category`)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-baseline md:justify-between">
          <p className="max-w-measure text-xs text-pretty text-ink-muted">{t("footnote")}</p>
          <Link
            href="/systems/compare"
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium"
          >
            {t("compareLink")}
            <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

type SystemCardProps = {
  system: EverestSystem;
  name: string;
  children: ReactNode;
};

/** Image well and series name; the whole card links to the system page. */
function SystemCard({ system, name, children }: SystemCardProps) {
  const body = (
    <>
      {/* Multiply blends the renders' white backgrounds into the panel tone. */}
      <div className="relative aspect-square overflow-hidden bg-paper">{children}</div>
      <div className="mt-4 flex items-center justify-between gap-3 sm:mt-5">
        <h3 className="text-lg font-light text-balance tabular-nums font-stretch-semi-expanded sm:text-2xl">
          {name}
        </h3>
        <ArrowRightIcon className="size-5 shrink-0 text-ink-muted transition duration-300 ease-standard group-hover:translate-x-1 group-hover:text-ink" />
      </div>
    </>
  );

  return (
    <Link
      href={{ pathname: "/systems/[slug]", params: { slug: systemSlug(system.key) } }}
      className="group block"
    >
      {body}
    </Link>
  );
}
