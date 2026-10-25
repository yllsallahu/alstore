/**
 * EVEREST systems shown in the homepage "Systems" section (owner request, 2026-10-25).
 *
 * Names, categories and descriptions are paraphrased from the official EVEREST pages in
 * `sourceUrl` (read 2026-10-25); wording lives in Systems.items. Images are EVEREST's own
 * renders, served from everest.al through next/image (see next.config.ts remotePatterns),
 * except PVC, which reuses the EVEREST uPVC render already in public/media/.
 * See docs/CONTENT_SOURCES.md §5 for provenance.
 *
 * No technical values are published here on purpose. 30 000 Standard and 76 000 still need
 * complete public information (CONTENT_SOURCES.md §5).
 */

type SystemImage = { src: string; width: number; height: number };

export type EverestSystem = {
  /** Key in Systems.items. */
  key: "s30000" | "s60000" | "s70000" | "s71000" | "s76000" | "pvc";
  image: SystemImage;
  /** Official EVEREST page the wording and image come from (provenance, not rendered). */
  sourceUrl: string;
};

const uploads = "https://everest.al/wp-content/uploads/2020/04";

export const everestSystems: readonly EverestSystem[] = [
  {
    key: "s30000",
    image: { src: `${uploads}/30000-standard-series.jpg`, width: 700, height: 700 },
    sourceUrl: "https://everest.al/aluminium-full/products/30000-standard/",
  },
  {
    key: "s60000",
    image: { src: `${uploads}/sistemi-60000.jpg`, width: 700, height: 700 },
    sourceUrl: "https://everest.al/aluminium-full/products/60000-series/",
  },
  {
    key: "s70000",
    image: { src: `${uploads}/70000-series.jpg`, width: 700, height: 700 },
    sourceUrl: "https://everest.al/aluminium-full/products/70000-series/",
  },
  {
    key: "s71000",
    image: { src: `${uploads}/71000-series.jpg`, width: 700, height: 700 },
    sourceUrl: "https://everest.al/aluminium-full/products/71000-series/",
  },
  {
    key: "s76000",
    image: { src: `${uploads}/76000-series.jpg`, width: 700, height: 700 },
    sourceUrl: "https://everest.al/aluminium-full/products/76000-series/",
  },
  {
    key: "pvc",
    image: { src: "/media/categories/window.png", width: 714, height: 700 },
    sourceUrl: "https://everest.al/pvc-full/",
  },
];
