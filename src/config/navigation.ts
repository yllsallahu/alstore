import type { Locale } from "next-intl";

/**
 * Primary navigation. Labels live in messages (Navigation.*).
 *
 * The site is currently a single page, so every item except Home targets a
 * homepage anchor. Anchors are localized (/#produktet, /en#products).
 * Status of the targets:
 *   - contact: points at the existing contact block (#home-contact).
 *   - products: points at the product categories section (ProductCategories).
 *   - systems, about: their homepage sections are not built yet, so
 *     these links land on the homepage until those sections ship with the ids
 *     below. When a dedicated page replaces an anchor, change it to a route.
 */
const sectionAnchors = {
  products: { sq: "produktet", en: "products" },
  systems: { sq: "sistemet", en: "systems" },
  about: { sq: "rreth-nesh", en: "about" },
  contact: { sq: "home-contact", en: "home-contact" },
} as const satisfies Record<string, Record<Locale, string>>;

export type NavItemKey = "home" | keyof typeof sectionAnchors;

export const primaryNavigation: readonly NavItemKey[] = [
  "home",
  "products",
  "systems",
  "about",
  "contact",
];

/** Hash for a navigation item, or undefined for Home (plain "/"). */
export function navHash(item: NavItemKey, locale: Locale): string | undefined {
  return item === "home" ? undefined : sectionAnchors[item][locale];
}
