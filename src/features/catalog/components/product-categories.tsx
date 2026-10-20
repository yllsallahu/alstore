import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { navHash } from "@/config/navigation";

/**
 * Category entry points only: no category pages or products exist yet.
 * Copy and tags (system types) are paraphrased from everest.al; see CONTENT_SOURCES.md §5.
 */
const categories = [
  { key: "aluminium", tags: ["facades", "windowsDoors", "sliding", "railings"] },
  { key: "pvc", tags: ["upvcWindows", "upvcDoors"] },
  { key: "accessories", tags: [] },
] as const;

export function ProductCategories() {
  const t = useTranslations("ProductCategories");
  const locale = useLocale();

  return (
    <section
      id={navHash("products", locale)}
      aria-labelledby="product-categories"
      className="border-b border-line"
    >
      <Container className="grid gap-12 py-section lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <Image
            src="/media/categories/window.png"
            alt={t("imageAlt")}
            width={714}
            height={700}
            sizes="(min-width: 64rem) 40vw, 24rem"
            className="mx-auto h-auto w-full max-w-sm lg:max-w-lg"
          />
        </div>

        <div className="lg:col-span-7">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2
            id="product-categories"
            className="mt-6 text-3xl font-semibold text-balance font-stretch-semi-expanded"
          >
            {t("title")}
          </h2>
          <p className="mt-6 max-w-measure text-lg text-pretty text-ink-muted">
            {t("certification")}
          </p>

          <ol className="mt-10 border-t border-line">
            {categories.map(({ key, tags }, index) => (
              <li
                key={key}
                className="grid gap-x-6 gap-y-3 border-b border-line py-8 sm:grid-cols-12"
              >
                <span className="flex items-center gap-3 self-start pt-2 text-xs font-medium text-ink-muted tabular-nums sm:col-span-2">
                  <span aria-hidden="true" className="h-px w-6 bg-accent" />
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="sm:col-span-10">
                  <h3 className="text-2xl font-semibold font-stretch-semi-expanded">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="mt-3 max-w-measure text-pretty text-ink-muted">
                    {t(`${key}.description`)}
                  </p>
                  {tags.length > 0 ? (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-sm border border-line px-3 py-1 text-xs font-semibold uppercase tracking-label text-ink-muted"
                        >
                          {t(`tags.${tag}`)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
