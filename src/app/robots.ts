import type { MetadataRoute } from "next";
import { env } from "@/config/env";

/** Blocks all crawling unless SITE_INDEXABLE=true (approved production only). */
export default function robots(): MetadataRoute.Robots {
  if (!env.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", `${env.siteUrl}/`).toString(),
  };
}
