import type { Locale } from "next-intl";
import { siteConfig } from "@/config/site";
import { type AppHref, absoluteUrl } from "@/lib/seo/urls";

type SystemProductInput = {
  locale: Locale;
  href: AppHref;
  name: string;
  description: string;
  category: string;
  image: string;
};

/**
 * schema.org Product for a system page. EVEREST is brand and manufacturer; AL STORE is not
 * named as either. No offers, prices, ratings or availability (SEO_RULES.md §5).
 */
export function systemProductJsonLd({
  locale,
  href,
  name,
  description,
  category,
  image,
}: SystemProductInput) {
  const { manufacturer } = siteConfig;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    category,
    image,
    url: absoluteUrl(locale, href),
    brand: { "@type": "Brand", name: manufacturer.name },
    manufacturer: { "@type": "Organization", name: manufacturer.name, url: manufacturer.url },
  };
}
