"use client";

// Client Component: owns the open/close state of the small-screen menu. It is a
// native modal <dialog>, so the browser provides the focus trap, Escape key,
// inert background and focus return; this file only opens it and closes it
// after a link is chosen. Labels arrive as props (no client message namespace).

import { type ReactNode, useRef } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

type NavLink = { key: string; hash?: string; label: string };

type MobileNavProps = {
  links: readonly NavLink[];
  phone: { href: string; display: string; label: string };
  labels: { open: string; close: string; dialog: string };
  /** Server-rendered identity for the dialog's top bar. */
  brand: ReactNode;
};

export function MobileNav({ links, phone, labels, brand }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

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
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink opacity-0 transition-all transition-discrete duration-300 ease-standard backdrop:bg-graphite/40 open:opacity-100 starting:open:opacity-0 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-line px-gutter sm:h-20">
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

          <nav aria-label={labels.dialog} className="flex-1 overflow-y-auto px-gutter py-6">
            <ol>
              {links.map((link, index) => (
                <li key={link.key}>
                  <Link
                    href={link.hash ? { pathname: "/", hash: link.hash } : "/"}
                    onClick={close}
                    className="flex min-h-16 items-center gap-5 border-b border-line text-2xl font-semibold font-stretch-semi-expanded transition-colors duration-200 ease-standard hover:text-accent-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="w-6 text-xs font-medium text-ink-muted tabular-nums"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="shrink-0 border-t border-line px-gutter py-6">
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
