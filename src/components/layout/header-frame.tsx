"use client";

// Client Component: on the home page the header sits transparently over the
// full-screen hero video and turns solid once the hero has scrolled away, which
// needs the current pathname and the scroll position. Everything inside the bar
// stays server-rendered and reacts through `group-data-overlay/header:` styles.

import { type ReactNode, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Solid once less than this much of the hero (min-h-dvh) is left on screen. It must exceed
 * the anchor offset (`scroll-padding-top: 6rem` = 96px in globals.css): an in-page jump
 * leaves that much hero showing, and the hero copy must not run behind a transparent bar.
 */
const SOLID_BEFORE_HERO_END_PX = 112;

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const isPastHero = () => window.scrollY > window.innerHeight - SOLID_BEFORE_HERO_END_PX;

export function HeaderFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === "/";
  const pastHero = useSyncExternalStore(subscribe, isPastHero, () => false);

  return (
    <header
      data-overlay={isHome && !pastHero ? "" : undefined}
      className="group/header sticky top-0 z-40 border-b border-line bg-paper transition-colors duration-200 ease-standard data-overlay:border-on-graphite/20 data-overlay:bg-transparent"
    >
      {children}
    </header>
  );
}
