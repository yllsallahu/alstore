import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { archivo } from "@/styles/fonts";

/**
 * Fallback 404 for requests that never reach the [locale] segment (e.g. a
 * missing file path). It has no locale context, so it is bilingual and static.
 */
export default function RootNotFound() {
  return (
    <html lang="sq" className={archivo.variable}>
      <body>
        <main className="mx-auto max-w-site px-gutter py-section">
          <h1 className="text-3xl font-semibold font-stretch-semi-expanded">Faqja nuk u gjet</h1>
          <p lang="en" className="mt-2 text-xl text-ink-muted">
            Page not found
          </p>
          <Link href="/" className={buttonClasses("primary", "mt-10")}>
            AL STORE
          </Link>
        </main>
      </body>
    </html>
  );
}
