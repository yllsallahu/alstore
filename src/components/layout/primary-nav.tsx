"use client";

// Client Component: marks the link of the current page (aria-current + bronze underline),
// which needs the pathname. Labels and targets arrive as props, so no message namespace.

import type { LinkHref } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

type PrimaryNavProps = {
  label: string;
  links: readonly { key: string; href: LinkHref; label: string }[];
};

const linkClass =
  "relative inline-flex min-h-11 items-center text-sm transition-colors duration-200 ease-standard after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-accent after:transition-transform after:duration-300 after:ease-standard hover:after:scale-x-100";

/** Desktop primary navigation (lg+). Homepage anchors are never "current". */
export function PrimaryNav({ label, links }: PrimaryNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="mx-auto hidden lg:block">
      <ul className="flex items-center gap-8 xl:gap-10">
        {links.map((link) => {
          const target = typeof link.href === "string" ? link.href : null;
          const isCurrent = target !== null && target !== "/" && pathname.startsWith(target);
          return (
            <li key={link.key}>
              <Link
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cx(
                  linkClass,
                  isCurrent
                    ? "text-ink after:scale-x-100 group-data-overlay/header:text-on-graphite"
                    : "text-ink-muted after:scale-x-0 hover:text-ink group-data-overlay/header:text-on-graphite/80 group-data-overlay/header:hover:text-on-graphite",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
