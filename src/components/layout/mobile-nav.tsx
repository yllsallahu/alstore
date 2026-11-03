"use client";

// Client Component: owns the open/close state of the small-screen menu. It is a
// native modal <dialog>, so the browser provides the focus trap, Escape key,
// inert background and focus return; this file only opens it and closes it
// after a link is chosen, and marks the current page. Labels arrive as props (no client
// message namespace).

import { type ReactNode, useRef } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { ArrowRightIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";
import type { LinkHref as Href } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/lib/cx";

type NavLink = { key: string; href: Href; label: string };

type MobileNavProps = {
  links: readonly NavLink[];
  phone: { href: string; display: string; label: string };
  quote: { href: Href; label: string };
  labels: { open: string; close: string; dialog: string };
  /** Server-rendered identity for the dialog's top bar. */
  brand: ReactNode;
};

const delays = ["delay-75", "delay-100", "delay-150", "delay-200", "delay-300"] as const;

export function MobileNav({ links, phone, quote, labels, brand }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();
  const pathname = usePathname();
  const isCurrent = (href: Href) =>
    typeof href === "string" && href !== "/" && pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center text-ink transition-colors duration-200 ease-standard hover:text-accent-ink lg:hidden group-data-overlay/header:text-on-graphite group-data-overlay/header:hover:text-accent"
      >
        <MenuIcon />
        <span className="sr-only">{labels.open}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={labels.dialog}
        className="group/menu m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink opacity-0 transition-all transition-discrete duration-300 ease-standard backdrop:bg-graphite/40 open:opacity-100 starting:open:opacity-0 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between gap-6 px-gutter sm:h-20">
            {brand}
            <button
              type="button"
              onClick={close}
              className="-mr-2 inline-flex size-11 items-center justify-center text-ink transition-colors duration-200 ease-standard hover:text-accent-ink"
            >
              <CloseIcon />
              <span className="sr-only">{labels.close}</span>
            </button>
          </div>

          <nav aria-label={labels.dialog} className="flex-1 overflow-y-auto px-gutter pt-8 pb-6">
            <ol className="border-t border-line">
              {links.map((link, index) => (
                <li
                  key={link.key}
                  className={`translate-y-0 opacity-100 transition duration-500 ease-out-soft motion-reduce:transition-none starting:group-open/menu:translate-y-3 starting:group-open/menu:opacity-0 ${delays[Math.min(index, delays.length - 1)]}`}
                >
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={isCurrent(link.href) ? "page" : undefined}
                    className={cx(
                      "group/link flex min-h-18 items-center justify-between gap-5 border-b border-line text-2xl font-light font-stretch-semi-expanded transition-colors duration-200 ease-standard hover:text-accent-ink",
                      isCurrent(link.href) && "text-accent-ink",
                    )}
                  >
                    <span className="flex items-baseline gap-5">
                      <span aria-hidden="true" className="w-6 text-xs text-ink-muted tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </span>
                    <ArrowRightIcon className="size-5 text-ink-muted transition-transform duration-300 ease-standard group-hover/link:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="grid shrink-0 gap-3 px-gutter pt-4 pb-8 sm:grid-cols-2">
            <Link href={quote.href} onClick={close} className={buttonClasses("primary", "w-full")}>
              {quote.label}
            </Link>
            <a
              href={phone.href}
              aria-label={phone.label}
              className={buttonClasses("secondary", "w-full tabular-nums")}
            >
              {phone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
