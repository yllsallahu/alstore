import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { PreviewBanner, type PreviewUser } from "./preview-banner";

export function AppShell({
  preview,
  previewUser,
  children,
}: {
  preview: boolean;
  previewUser?: PreviewUser | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#permbajtja"
        className="bg-surface sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Kalo te përmbajtja
      </a>

      <aside className="border-line bg-surface hidden border-r lg:flex lg:flex-col">
        <div className="border-line flex h-16 items-center border-b px-5">
          <Link href="/" className="text-ink text-lg font-semibold tracking-tight">
            AL STORE
          </Link>
        </div>
        <nav aria-label="Navigimi kryesor" className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-line bg-surface sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-2 lg:hidden">
          <MobileNav />
          <Link href="/" className="text-base font-semibold tracking-tight">
            AL STORE
          </Link>
        </header>

        {preview && <PreviewBanner user={previewUser ?? null} />}

        <main
          id="permbajtja"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
