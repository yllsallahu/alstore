import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Legacy URLs from the previous static site (docs/SEO_RULES.md §6) that have an equivalent
  // page. The rest (FAQ, portfolio, llms.txt) are left to 404 until a matching page ships.
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/everest-kosove", destination: "/", permanent: true },
      { source: "/about.html", destination: "/rreth-nesh", permanent: true },
      { source: "/contact.html", destination: "/#home-contact", permanent: true },
      { source: "/certificate.html", destination: "/dokumentet", permanent: true },
      { source: "/everest.pdf", destination: "/dokumentet", permanent: true },
      { source: "/blog-home.html", destination: "/njohuri", permanent: true },
      { source: "/blog-post.html", destination: "/njohuri", permanent: true },
    ];
  },
  images: {
    // Official EVEREST system renders (Systems section). Provenance: CONTENT_SOURCES.md §5.
    remotePatterns: [
      { protocol: "https", hostname: "everest.al", pathname: "/wp-content/uploads/**", search: "" },
      // Unsplash photographs (src/config/photography.ts). Provenance: CONTENT_SOURCES.md §4.
      // The exact query string keeps the optimizer to the one source size used there.
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
        search: "?auto=format&fit=max&w=3200&q=85",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
