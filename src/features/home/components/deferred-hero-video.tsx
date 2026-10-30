"use client";

// Client Component: decides whether/when to mount the autoplay hero video so the
// poster image stays the LCP candidate on mid-range 4G phones.

import { useEffect, useState } from "react";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * Mounts the looping hero MP4 only after idle time, and skips it entirely when
 * the user prefers reduced motion or is on a constrained connection.
 */
export function DeferredHeroVideo() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (
      connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g"
    ) {
      return;
    }

    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(enable, { timeout: 2000 });
      return () => {
        cancelled = true;
        idle.cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(enable, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 size-full object-cover"
    >
      <source src="/media/hero-video.mp4" type="video/mp4" />
    </video>
  );
}
