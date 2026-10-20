import type { ReactNode } from "react";
import "@/styles/globals.css";

/**
 * Pass-through root layout. The <html> element is rendered by
 * app/[locale]/layout.tsx so its `lang` attribute always matches the URL.
 * Requests outside the locale segment fall back to app/not-found.tsx.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
