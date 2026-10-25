import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Official EVEREST system renders (Systems section). Provenance: CONTENT_SOURCES.md §5.
    remotePatterns: [
      { protocol: "https", hostname: "everest.al", pathname: "/wp-content/uploads/**", search: "" },
    ],
  },
};

export default withNextIntl(nextConfig);
