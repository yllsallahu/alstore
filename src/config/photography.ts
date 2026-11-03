import type { StaticImageData } from "next/image";
import glassPavilion from "@/assets/photography/glass-pavilion.jpg";
import glassTower from "@/assets/photography/glass-tower.jpg";
import profileGasket from "@/assets/photography/profile-gasket.jpg";
import profileSection from "@/assets/photography/profile-section.jpg";
import series60000 from "@/assets/photography/series-60000.jpg";
import series70000 from "@/assets/photography/series-70000.jpg";
import series71000 from "@/assets/photography/series-71000.jpg";
import series76000 from "@/assets/photography/series-76000.jpg";
import seriesPvc from "@/assets/photography/series-pvc.jpg";

/**
 * Site photography. Provenance per file: docs/CONTENT_SOURCES.md §4. Alt text lives in
 * messages (Photography.alt.*). Rules (DESIGN_RULES.md §8): every photograph is illustrative,
 * never captioned as an AL STORE project, and only the EVEREST catalogue's own series pages tie a
 * photograph to a series (series60000/70000/71000/76000 and seriesPvc, each from the
 * catalogue page of that series).
 *
 * Two kinds of source, both at full resolution (owner brief 2026-11-03: "no blurry photos"):
 * - Local: EVEREST material from the project folder "6. Videot teknike" (catalogue 2024 photos,
 *   native 1080p stills from the technical films). Static imports give next/image the intrinsic
 *   size and a blur placeholder.
 * - Unsplash: free photographs under the Unsplash License, chosen by the owner's request to
 *   replace soft catalogue crops. Served from images.unsplash.com (next.config.ts
 *   remotePatterns); next/image resizes them from a 3200px source.
 */
export type RemotePhoto = { src: string; width: number; height: number };

const unsplash = (id: string, width: number, height: number): RemotePhoto => ({
  src: `https://images.unsplash.com/photo-${id}?auto=format&fit=max&w=3200&q=85`,
  width,
  height,
});

export const photography = {
  duskHouse: unsplash("1600585154340-be6161a56a0c", 4500, 3000),
  livingRoom: unsplash("1600607687939-ce8a6c25118c", 4500, 3060),
  kitchenWindow: unsplash("1662624915046-02d9d4ee724d", 5240, 3655),
  seaSlide: unsplash("1565261949232-3fcc78206c0c", 4896, 3264),
  whiteWindow: unsplash("1496092607007-ca127e0b6a10", 5813, 3707),
  timberFacade: unsplash("1600566753190-17f0baa2a6c3", 6720, 4480),
  poolVilla: unsplash("1613490493576-7fde63acd811", 5969, 3979),
  glassPavilion,
  glassTower,
  series60000,
  series70000,
  series71000,
  series76000,
  seriesPvc,
  profileSection,
  profileGasket,
} as const satisfies Record<string, StaticImageData | RemotePhoto>;

export type PhotoKey = keyof typeof photography;
