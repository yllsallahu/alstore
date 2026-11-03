import type { Locale } from "next-intl";
import type { ComponentProps } from "react";
import type { Link } from "@/i18n/navigation";

/** Any target accepted by the localized `Link`, including in-page hashes. */
export type LinkHref = ComponentProps<typeof Link>["href"];

/**
 * Primary navigation. Labels live in messages (Navigation.*).
 *
 * Systems and Contact are homepage sections, reached by localized anchors
 * (/#sistemet, /en#systems). Films, Documents, Knowledge and About are pages.
 */
const sectionAnchors = {
  systems: { sq: "sistemet", en: "systems" },
  contact: { sq: "home-contact", en: "home-contact" },
} as const satisfies Record<string, Record<Locale, string>>;

type SectionKey = keyof typeof sectionAnchors;

const pageRoutes = {
  films: "/films",
  documents: "/documents",
  knowledge: "/knowledge",
  about: "/about",
} as const satisfies Record<string, LinkHref>;

export type NavItemKey = SectionKey | keyof typeof pageRoutes;

export const primaryNavigation: readonly NavItemKey[] = [
  "systems",
  "films",
  "documents",
  "knowledge",
  "about",
  "contact",
];

/** Anchor id of a homepage section, e.g. "sistemet" in Albanian. */
export function navHash(item: SectionKey, locale: Locale): string {
  return sectionAnchors[item][locale];
}

const isSection = (item: NavItemKey): item is SectionKey => item in sectionAnchors;

/** Localized link target for a navigation item. */
export function navHref(item: NavItemKey, locale: Locale): LinkHref {
  return isSection(item) ? { pathname: "/", hash: navHash(item, locale) } : pageRoutes[item];
}
