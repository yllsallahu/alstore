import type { Locale } from "next-intl";
import type { ComponentProps } from "react";
import { navHash } from "@/config/navigation";
import { listSystemPages } from "@/features/catalog/system-specs";
import type { EverestSystem } from "@/features/catalog/systems";
import type { Link } from "@/i18n/navigation";
import type { AppHref } from "@/lib/seo/urls";
import type { ArticleKey, InternalTarget } from "./schemas";

/** Anything the localized <Link> accepts, including a hash. */
type LinkHref = ComponentProps<typeof Link>["href"];

/** Route of each article. Slugs per locale are in src/i18n/routing.ts. */
export function articleHref(key: ArticleKey): AppHref {
  return `/knowledge/${key}`;
}

/**
 * Systems with their own page (src/features/catalog/system-specs.ts). Article links to any
 * other system land on the homepage Systems section.
 */
const systemPages: Partial<Record<EverestSystem["key"], LinkHref>> = Object.fromEntries(
  listSystemPages().map(({ key, slug }) => [
    key,
    { pathname: "/systems/[slug]", params: { slug } },
  ]),
);

/** A resolved target: a localized route for <Link>, or a static file for <a>. */
export type ResolvedTarget = { kind: "route"; href: LinkHref } | { kind: "file"; href: string };

export function resolveTarget(target: InternalTarget, locale: Locale): ResolvedTarget {
  switch (target.page) {
    case "systems":
      return { kind: "route", href: { pathname: "/", hash: navHash("systems", locale) } };
    case "contact":
      return { kind: "route", href: { pathname: "/", hash: navHash("contact", locale) } };
    case "documents":
      return { kind: "route", href: "/documents" };
    case "article":
      return { kind: "route", href: articleHref(target.article) };
    case "system":
      return {
        kind: "route",
        href: systemPages[target.system] ?? {
          pathname: "/",
          hash: navHash("systems", locale),
        },
      };
    case "file":
      return { kind: "file", href: target.path };
  }
}
