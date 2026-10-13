"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HOME, MODULES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { HOME_ICON, MODULE_ICONS } from "./nav-icons";

const items = [
  { href: HOME.href, label: HOME.label, Icon: HOME_ICON },
  ...MODULES.map((m) => ({ href: m.href, label: m.label, Icon: MODULE_ICONS[m.slug] })),
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-ink hover:bg-brand-soft flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px]",
                active && "bg-brand-soft text-brand font-semibold",
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
