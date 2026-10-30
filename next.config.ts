import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Long-lived cache for fingerprinted or content-addressed static media. */
const immutableCache = "public, max-age=31536000, immutable";
/** Shorter cache for technical PDFs that may be replaced with the same path. */
const documentCache = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Serve AVIF when the client accepts it, otherwise WebP. Sources are already WebP.
    formats: ["image/avif", "image/webp"],
    // Cache optimized derivatives for 30 days on the CDN / image optimizer.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: immutableCache }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: immutableCache }],
      },
      {
        source: "/documents/:path*",
        headers: [{ key: "Cache-Control", value: documentCache }],
      },
      // /_next/static/* already gets immutable caching from Next in production — do not override.
    ];
  },
};

export default withNextIntl(nextConfig);
