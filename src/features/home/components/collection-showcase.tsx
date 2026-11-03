import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealDelays, revealItem } from "@/components/ui/reveal-classes";
import type { PhotoKey } from "@/config/photography";
import { type LinkHref, navHref } from "@/config/navigation";
import { Link } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

type Entry = {
  key: "windows" | "sliding" | "pvc";
  photo: PhotoKey;
  /** Layout slot in the asymmetric grid. */
  slot: string;
  ratio: string;
};

/*
 * Three ways into the range, each backed by a verified source: windows and doors (EVEREST
 * product list: 60 000 / 70 000 / 71 000), sliding systems (IRCCOS RP2157 for 91 000, RP2144 and
 * RP2145 for 92 000) and PVC (RP2176 for 85 000). Photographs are illustrative (Unsplash).
 */
const entries: readonly Entry[] = [
  {
    key: "windows",
    photo: "kitchenWindow",
    slot: "md:col-span-7 md:row-span-2",
    ratio: "aspect-4/5 md:aspect-auto md:h-full",
  },
  { key: "sliding", photo: "seaSlide", slot: "md:col-span-5", ratio: "aspect-4/3" },
  { key: "pvc", photo: "whiteWindow", slot: "md:col-span-5", ratio: "aspect-4/3" },
];

function entryHref(key: Entry["key"], systemsHref: LinkHref): LinkHref {
  if (key === "sliding") return { pathname: "/documents", hash: "rp2157" };
  if (key === "pvc") return { pathname: "/documents", hash: "pvc" };
  return systemsHref;
}

/** Image-led product showcase: an asymmetric, editorial grid of three collections. */
export async function CollectionShowcase() {
  const t = await getTranslations("HomePage.collection");
  const locale = await getLocale();
  const systemsHref = navHref("systems", locale);

  return (
    <section aria-labelledby="collection" className="pb-section">
      <Container>
        <div className="flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="collection"
              className="mt-5 text-3xl font-light text-balance font-stretch-semi-expanded"
            >
              {t("title")}
            </h2>
          </div>
          <Link
            href={systemsHref}
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            {t("allAction")}
            <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover:translate-x-1" />
          </Link>
        </div>

        <Reveal className="mt-12 md:mt-16">
          <ul className="grid gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-6">
            {entries.map(({ key, photo, slot, ratio }, index) => (
              <li key={key} className={cx(slot, revealItem, revealDelays[index])}>
                <Link
                  href={entryHref(key, systemsHref)}
                  className={cx(
                    "group relative isolate flex overflow-hidden bg-stone text-on-graphite",
                    ratio,
                  )}
                >
                  <Photo
                    name={photo}
                    sizes={
                      index === 0
                        ? "(min-width: 48rem) 58vw, 100vw"
                        : "(min-width: 48rem) 42vw, 100vw"
                    }
                    className="-z-10 transition-transform duration-1000 ease-out-soft group-hover:scale-105 motion-reduce:transition-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-linear-to-t from-graphite/75 via-graphite/0 to-graphite/0"
                  />
                  <span className="mt-auto flex w-full items-end justify-between gap-6 p-6 sm:p-8">
                    <span>
                      <span className="block text-xs font-medium tracking-label text-on-graphite/80 uppercase">
                        {t(`items.${key}.label`)}
                      </span>
                      <span className="mt-2 block text-2xl font-light text-balance font-stretch-semi-expanded">
                        {t(`items.${key}.title`)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-on-graphite/40 transition-colors duration-300 ease-standard group-hover:border-on-graphite group-hover:bg-on-graphite group-hover:text-ink"
                    >
                      <ArrowRightIcon className="size-4" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
