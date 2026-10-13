import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-ink-muted text-sm font-medium">404</p>
        <h1 className="mt-1 text-2xl font-semibold">Faqja nuk u gjet</h1>
        <p className="text-ink-muted mt-2">Adresa që keni hapur nuk ekziston.</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/">Kthehu në ballinë</Link>
        </Button>
      </div>
    </main>
  );
}
