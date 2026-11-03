"use client";

// Client Component: the film loads only when the visitor presses play (click-to-load keeps
// several films on one page light), which needs local state. Copy arrives as props, so no
// message namespace is sent to the browser.

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { PlayIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import type { TechnicalFilm } from "../films";

type FilmPlayerProps = {
  film: Pick<TechnicalFilm, "video" | "poster">;
  /** Accessible name of the play button, e.g. "Play the 91 000 film (1:06)". */
  playLabel: string;
  /** Responsive `sizes` for the poster. */
  sizes: string;
  /** Text laid over the poster's bottom scrim until the film starts (from `sm` up). */
  caption?: ReactNode;
  className?: string;
};

/**
 * Poster with a round play button; pressing it swaps in the film with native controls and
 * starts it with sound. Fills its positioned parent (give the parent an aspect ratio).
 */
export function FilmPlayer({ film, playLabel, sizes, caption, className }: FilmPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <video
        controls
        autoPlay
        playsInline
        preload="auto"
        poster={film.poster.src}
        className={cx("absolute inset-0 size-full bg-graphite object-contain", className)}
      >
        <source src={film.video} type="video/mp4" />
      </video>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={cx("group absolute inset-0 block size-full text-left", className)}
    >
      <Image
        src={film.poster.src}
        alt=""
        width={film.poster.width}
        height={film.poster.height}
        sizes={sizes}
        className="absolute inset-0 size-full object-cover transition-transform duration-1000 ease-out-soft group-hover:scale-105 motion-reduce:transition-none"
      />
      {/* Functional scrim for the caption and the button. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-graphite/85 via-graphite/15 to-graphite/0"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full border border-on-graphite/70 bg-graphite/40 text-on-graphite transition duration-300 ease-standard group-hover:scale-110 group-hover:border-on-graphite group-hover:bg-on-graphite group-hover:text-ink motion-reduce:transition-none sm:size-20">
          <PlayIcon className="size-6 translate-x-0.5 fill-current sm:size-7" />
        </span>
        <span className="sr-only">{playLabel}</span>
      </span>
      {caption ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 hidden p-8 text-on-graphite sm:block"
        >
          {caption}
        </span>
      ) : null}
    </button>
  );
}
