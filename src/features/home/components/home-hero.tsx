import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Photo } from "@/components/ui/photo";
import { navHref } from "@/config/navigation";
import { Link } from "@/i18n/navigation";

/**
 * Full-screen home hero: one architectural photograph, a short editorial headline and two
 * actions. Pulled up under the sticky header (h-16 / sm:h-20), which turns transparent here.
 */
export async function HomeHero() {
  const t = await getTranslations("HomePage.hero");
  const locale = await getLocale();
  const everest = (chunks: ReactNode) => <span className="text-everest">{chunks}</span>;

  return (
    <section
      aria-labelledby="home-hero"
      className="relative isolate -mt-16 flex min-h-svh items-end overflow-hidden bg-graphite text-on-graphite sm:-mt-20"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Photo
          name="duskHouse"
          decorative
          priority
          sizes="100vw"
          className="animate-settle object-center motion-reduce:animate-none"
        />
        {/* Functional scrim: keeps the overlaid header and the copy legible. */}
        <div className="absolute inset-0 bg-linear-to-t from-graphite/90 via-graphite/25 to-graphite/55" />
      </div>

      <Container className="w-full pt-40 pb-10 sm:pb-14 lg:pb-16">
        <p className="text-xs font-medium tracking-label text-on-graphite/80 uppercase animate-rise motion-reduce:animate-none">
          {t.rich("eyebrow", { everest })}
        </p>
        <h1
          id="home-hero"
          className="mt-5 max-w-headline text-hero font-light text-balance font-stretch-semi-expanded animate-rise-2 motion-reduce:animate-none"
        >
          {t("title")}
        </h1>

        <div className="mt-10 grid gap-8 border-t border-on-graphite/20 pt-6 animate-rise-3 motion-reduce:animate-none sm:mt-14 md:grid-cols-12 md:items-end">
          <p className="max-w-sm text-lg text-pretty text-on-graphite/85 md:col-span-6">
            {t.rich("lead", { everest })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row md:col-span-6 md:justify-end">
            <Link href={navHref("systems", locale)} className={buttonClasses("primaryInverse")}>
              {t("systemsAction")}
              <ArrowRightIcon className="size-4 transition-transform duration-300 ease-standard group-hover/button:translate-x-1" />
            </Link>
            <Link href={navHref("contact", locale)} className={buttonClasses("secondaryInverse")}>
              {t("quoteAction")}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
