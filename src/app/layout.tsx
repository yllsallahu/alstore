import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AL STORE", template: "%s · AL STORE" },
  description: "Aplikacion privat për shitje me shumicë B2B.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sq-XK">
      <body>{children}</body>
    </html>
  );
}
