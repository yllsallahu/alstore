/**
 * Owner-supplied moving images in public/media/. Provenance: docs/CONTENT_SOURCES.md §4.
 *
 * Every clip and poster is at the source film's native 1080p resolution (never upscaled).
 * Ambient loops are short, muted, captionless clips that play behind a section like a
 * photograph does. Each has a poster (its first frame) that shows while the clip loads and,
 * under reduced motion, instead of it. Width and height are the poster's real pixel size.
 */

export type MediaPoster = { src: string; width: number; height: number };
export type AmbientLoop = { video: string; poster: MediaPoster };

export const ambientLoops = {
  /** "Everest 93 000 minimal Slide.mp4", 0:22–0:32: sliding glazing over a city view, caption bar cropped out. */
  interior93000: {
    video: "/media/loops/interior-93000.mp4",
    poster: { src: "/media/loops/interior-93000-poster.jpg", width: 1920, height: 1004 },
  },
  /** "Everest 93 000 minimal Slide.mp4", 1:06–1:12: villa exterior render, no logo on screen. */
  villa93000: {
    video: "/media/loops/villa-93000.mp4",
    poster: { src: "/media/loops/villa-93000-poster.jpg", width: 1920, height: 1080 },
  },
  /** "91 000 slide system.mp4", 0:40–0:47: profile cutaway, logo and caption bar cropped out. */
  profile91000: {
    video: "/media/loops/profile-91000.mp4",
    poster: { src: "/media/loops/profile-91000-poster.jpg", width: 1650, height: 930 },
  },
  /** "Seria 30 000 1.mp4", 1:18–1:27: mullion and transom assembly, logo cropped out. */
  facade30000: {
    video: "/media/loops/facade-30000.mp4",
    poster: { src: "/media/loops/facade-30000-poster.jpg", width: 1536, height: 950 },
  },
} as const satisfies Record<string, AmbientLoop>;

export type AmbientLoopKey = keyof typeof ambientLoops;
