"use client";

// Replaces the root layout when it fails, so it renders its own <html> and
// cannot rely on next-intl. Copy is bilingual and static.

import "@/styles/globals.css";
import { buttonClasses } from "@/components/ui/button-classes";
import { archivo } from "@/styles/fonts";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="sq" className={archivo.variable}>
      <body>
        <main className="mx-auto max-w-site px-gutter py-section">
          <h1 className="text-3xl font-semibold font-stretch-semi-expanded">Diçka shkoi keq</h1>
          <p lang="en" className="mt-2 text-xl text-ink-muted">
            Something went wrong
          </p>
          <button type="button" onClick={reset} className={buttonClasses("primary", "mt-10")}>
            Provo përsëri · <span lang="en">Try again</span>
          </button>
          {error.digest ? <p className="mt-6 text-xs text-ink-muted">Ref: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
