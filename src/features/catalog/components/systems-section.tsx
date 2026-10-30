import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { navHash } from "@/config/navigation";
import { everestSystems } from "@/features/catalog/systems";

/**
 * Homepage "Systems" section: EVEREST aluminium and PVC systems that AL STORE distributes.
 */
export async function SystemsSection() {
  const t = await getTranslations("Systems");
  const locale = await getLocale();

  return (
    <section
      id={navHash("systems", locale)}
      aria-labelledby="everest-systems"
      className="border-b border-line"
    >
      <Container className="py-section">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="everest-systems"
              className="mt-4 text-3xl font-semibold text-balance font-stretch-semi-expanded"
            >
              {t("title")}
            </h2>
          </div>
          <p className="max-w-measure text-pretty text-ink-muted lg:col-span-5">{t("intro")}</p>
        </div>

        <ul className="mt-12 grid border-t border-l border-line sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {everestSystems.map(({ key, image }) => (
            <li key={key} className="flex flex-col border-r border-b border-line">
              <div className="relative aspect-4/3 overflow-hidden bg-paper-sunken">
                {/* Multiply blends the renders' white backgrounds into the panel tone. */}
                <Image
                  src={image.src}
                  alt={t(`items.${key}.alt`)}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 64rem) 28rem, (min-width: 40rem) 50vw, 100vw"
                  loading="lazy"
                  className="size-full object-contain p-6 mix-blend-multiply"
                />
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-label text-accent-ink">
                  {t(`items.${key}.category`)}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tabular-nums text-brand font-stretch-semi-expanded">
                  {t(`items.${key}.name`)}
                </h3>
                <p className="mt-4 text-pretty text-ink-muted">{t(`items.${key}.description`)}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-measure text-sm text-pretty text-ink-muted">{t("footnote")}</p>
      </Container>
    </section>
  );
}
