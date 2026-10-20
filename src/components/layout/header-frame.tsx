"use client";

// Client Component: on the home page the header sits transparently over the
// full-screen hero video and turns solid once the hero has scrolled away, which
// needs the current pathname and the scroll position. Everything inside the bar
// stays server-rendered and reacts through `group-data-overlay/header:` styles.

import { type ReactNode, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";

/** Tallest header bar (sm:h-20). The hero is min-h-dvh. */
const HEADER_HEIGHT_PX = 80;

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const isPastHero = () => window.scrollY > window.innerHeight - HEADER_HEIGHT_PX;

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
