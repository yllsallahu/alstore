"use client";
// Client Component: GSAP ScrollTrigger pins the section and scrubs the truck on scroll.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef } from "react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { siteConfig } from "@/config/site";
import { truckImage } from "../truck-assets";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll story after the EVEREST history: the truck crosses the screen while the
 * copy hands over from the intro to the secondary line. Reduced motion gets a
 * static, unpinned layout with everything visible.
 */
export function TruckScrollHero() {
  const t = useTranslations("TruckScrollHero");
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const truck = section.querySelector<HTMLElement>("[data-truck]");
        if (!truck) return;

        gsap.set("[data-secondary]", { autoAlpha: 0, y: 24 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=160%",
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        // Truck: fully off-screen left → fully off-screen right.
        tl.fromTo(
          truck,
          { x: () => -truck.offsetWidth },
          { x: () => window.innerWidth, duration: 1 },
          0,
        )
          .to("[data-wheel]", { rotation: 720, transformOrigin: "50% 50%", duration: 1 }, 0)
          // Copy: intro out, secondary line in.
          .to("[data-intro]", { autoAlpha: 0, y: -24, duration: 0.2, stagger: 0.03 }, 0.35)
          .to("[data-secondary]", { autoAlpha: 1, y: 0, duration: 0.2 }, 0.55)
          // Depth: background shapes drift slower than the truck.
          .to("[data-shape='far']", { xPercent: -12, duration: 1 }, 0)
          .to("[data-shape='near']", { xPercent: -30, duration: 1 }, 0);
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="truck-hero"
      className="relative isolate overflow-hidden border-b border-line bg-paper lg:h-svh"
    >
      {/* Aluminium-profile inspired geometry. Decorative only. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div
          data-shape="far"
          className="absolute top-1/4 right-0 h-1/3 w-2/3 border-y border-line bg-paper-sunken"
        />
        <div data-shape="far" className="absolute top-1/4 right-1/4 h-1/3 w-px bg-line" />
        <div data-shape="near" className="absolute bottom-1/4 left-0 h-px w-full bg-line-strong" />
        <div
          data-shape="near"
          className="absolute bottom-1/4 left-1/2 h-24 w-1/4 border-x border-t border-line"
        />
      </div>

      <Container className="relative flex h-full flex-col gap-10 py-16 lg:py-24">
        <div className="grid gap-10 lg:my-auto lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="relative lg:col-span-7">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h2
              id="truck-hero"
              className="mt-4 text-3xl font-semibold text-balance font-stretch-semi-expanded"
            >
              {t("title")}
            </h2>
            {/* Paragraph and secondary line share one grid cell and swap on scroll. */}
            <div className="mt-4 grid">
              <p
                data-intro
                className="col-start-1 row-start-1 max-w-measure text-pretty text-ink-muted"
              >
                {t("body")}
              </p>
              <p
                data-secondary
                className="col-start-1 row-start-1 text-xl font-semibold text-brand text-balance motion-reduce:row-start-2 motion-reduce:mt-4"
              >
                {t("secondary")}
              </p>
            </div>
          </div>

          {/* Stays visible through the scroll; only the intro copy hands over. */}
          <div className="lg:col-span-5">
            <dl className="grid grid-cols-3 gap-4 border-t border-line pt-6 sm:gap-8">
              {siteConfig.supplyStats.map(({ key, value }) => (
                <div key={key}>
                  <dt className="sr-only">{t(`stats.${key}`)}</dt>
                  <dd className="text-3xl font-semibold text-brand tabular-nums font-stretch-semi-expanded">
                    {value}
                  </dd>
                  <dd
                    aria-hidden="true"
                    className="mt-2 text-xs font-semibold uppercase tracking-label text-pretty text-ink-muted"
                  >
                    {t(`stats.${key}`)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-ink-muted">{t("statsNote")}</p>
          </div>
        </div>

        <div className="mt-auto">
          <div data-truck className="w-full max-w-4xl will-change-transform lg:w-3/4">
            {truckImage ? (
              <Image
                src={truckImage.src}
                alt={t("truckAlt")}
                width={truckImage.width}
                height={truckImage.height}
                sizes="(min-width: 64rem) 56rem, 100vw"
                className="h-auto w-full"
              />
            ) : (
              <TruckPlaceholder label={t("truckAlt")} />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Neutral side-view silhouette: two yellow curtain trailers and a white cab, named in plain text. */
function TruckPlaceholder({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 1200 300" role="img" aria-label={label} className="h-auto w-full">
      <g className="fill-everest stroke-ink" strokeWidth="2">
        <rect x="10" y="40" width="460" height="190" rx="4" />
        <rect x="485" y="40" width="460" height="190" rx="4" />
      </g>
      <g className="stroke-ink" strokeWidth="1" opacity="0.25">
        {Array.from({ length: 18 }, (_, i) => (
          <line key={i} x1={40 + i * 50} y1="215" x2={40 + i * 50} y2="230" />
        ))}
      </g>
      <path
        d="M960 40h120c40 0 60 30 70 60l30 70v60H960z"
        className="fill-paper stroke-ink"
        strokeWidth="2"
      />
      <path d="M1090 70h40l20 50h-60z" className="fill-graphite" />
      {/* Plain-text name only: the official EVEREST logo replaces this when its file arrives. */}
      <g aria-hidden="true" className="fill-ink font-sans font-black font-stretch-expanded">
        <text x="70" y="148" fontSize="80" textLength="340" lengthAdjust="spacingAndGlyphs">
          EVEREST
        </text>
        <text x="545" y="148" fontSize="80" textLength="340" lengthAdjust="spacingAndGlyphs">
          EVEREST
        </text>
        <text x="1000" y="160" fontSize="16" letterSpacing="1">
          EVEREST
        </text>
      </g>
      <rect x="10" y="230" width="1180" height="14" className="fill-graphite" />
      {[90, 170, 250, 560, 640, 1080].map((cx) => (
        <g key={cx} data-wheel>
          <circle cx={cx} cy="252" r="34" className="fill-ink" />
          <circle cx={cx} cy="252" r="14" className="fill-line" />
          <rect x={cx - 2} y="222" width="4" height="16" className="fill-line" />
        </g>
      ))}
    </svg>
  );
}
