import type { MediaPoster } from "@/config/media";

/**
 * EVEREST technical films, one per series (owner request, 2026-11-03: "add the technical
 * videos for the specific series"). Source files are in the project folder
 * "6. Videot teknike"; they are re-encoded for the web (720p H.264, sound kept; posters are 1080p frames) and otherwise
 * unaltered, EVEREST branding included. Provenance: docs/CONTENT_SOURCES.md §4.
 *
 * Wording lives in Films.items. The series name and category are the ones each film prints on
 * screen; the description says only what the film shows. No technical value is taken from a
 * film. Not published: Pergola, Gyotine and Longboard (products not confirmed as AL STORE's)
 * and "Seria 91 000 1.mp4" (a shorter cut of the 91 000 film).
 */

export const filmKeys = ["s93000", "s91000", "s92000", "s30000", "pvc85000"] as const;
export type FilmKey = (typeof filmKeys)[number];

export type TechnicalFilm = {
  key: FilmKey;
  /** Series as written in the document register (documents.ts), for cross-links. */
  series: string;
  group: "aluminium" | "pvc";
  video: string;
  poster: MediaPoster;
  orientation: "landscape" | "portrait";
  /** Running time in whole seconds, read from the encoded file. */
  durationSeconds: number;
  /** File name in "6. Videot teknike" (provenance, not rendered). */
  sourceFile: string;
};

const landscape = (key: string): Pick<TechnicalFilm, "video" | "poster" | "orientation"> => ({
  video: `/media/films/everest-${key}.mp4`,
  poster: { src: `/media/films/everest-${key}-poster.jpg`, width: 1920, height: 1080 },
  orientation: "landscape",
});

export const technicalFilms: readonly TechnicalFilm[] = [
  {
    key: "s93000",
    series: "93 000",
    group: "aluminium",
    ...landscape("93000"),
    durationSeconds: 111,
    sourceFile: "Everest 93 000 minimal Slide.mp4",
  },
  {
    key: "s91000",
    series: "91 000",
    group: "aluminium",
    ...landscape("91000"),
    durationSeconds: 66,
    sourceFile: "91 000 slide system.mp4",
  },
  {
    key: "s92000",
    series: "92 000",
    group: "aluminium",
    ...landscape("92000"),
    durationSeconds: 61,
    sourceFile: "Everest 92 000 List and Slide.mp4",
  },
  {
    key: "s30000",
    series: "30 000",
    group: "aluminium",
    ...landscape("30000"),
    durationSeconds: 150,
    sourceFile: "Seria 30 000 1.mp4",
  },
  {
    key: "pvc85000",
    series: "85 000",
    group: "pvc",
    video: "/media/films/everest-85000-pvc.mp4",
    poster: { src: "/media/films/everest-85000-pvc-poster.jpg", width: 850, height: 1334 },
    orientation: "portrait",
    durationSeconds: 17,
    sourceFile: "Everest PVC_Aluclip.mp4",
  },
];

/** "1:51" from 111. */
export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function filmForSeries(series: string | null) {
  return series ? technicalFilms.find((film) => film.series === series) : undefined;
}
