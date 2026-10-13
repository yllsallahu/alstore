"use client";

import { ErrorPanel } from "@/components/error-panel";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sq-XK">
      <body>
        <main className="flex min-h-dvh items-center justify-center px-4">
          <ErrorPanel digest={error.digest} onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
