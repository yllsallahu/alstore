import localFont from "next/font/local";

/**
 * Archivo variable (weight 100–900, width 62–125), Latin subset, self-hosted.
 * Licensed under the SIL Open Font License 1.1 (./fonts/OFL.txt).
 * Self-hosting avoids third-party font requests and keeps builds offline-safe.
 */
export const archivo = localFont({
  src: "./fonts/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});
