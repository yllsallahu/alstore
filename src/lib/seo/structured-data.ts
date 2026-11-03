import type { Locale } from "next-intl";
import { brandAssets } from "@/config/brand";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { type AppHref, absoluteUrl } from "./urls";

const businessId = `${env.siteUrl}/#business`;

type LocalBusinessInput = {
  locale: Locale;
  description: string;
  /** Localized country name for areaServed. */
  countryName: string;
};

/**
 * schema.org LocalBusiness for AL STORE, built only from verified facts in
 * siteConfig. Render on the home page via <JsonLd />. Do not add opening hours,
 * geo coordinates, ratings or price ranges until they are verified.
 */
export function localBusinessJsonLd({ locale, description, countryName }: LocalBusinessInput) {
  const { name, contact, address, manufacturer } = siteConfig;
  const logo = brandAssets.logo.primary;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": businessId,
    name,
    description,
    url: absoluteUrl(locale, "/"),
    telephone: contact.phone.e164,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.locality,
      postalCode: address.postalCode,
      addressCountry: address.countryCode,
    },
    hasMap: address.mapUrl,
    areaServed: { "@type": "Country", name: countryName },
    brand: { "@type": "Brand", name: manufacturer.name, url: manufacturer.url },
    ...(logo && {
      logo: new URL(logo.src, `${env.siteUrl}/`).toString(),
      image: new URL(logo.src, `${env.siteUrl}/`).toString(),
    }),
  };
}

/**
 * schema.org WebSite for the home page: the site name Google may show in
 * results, its languages and a link to the business above as publisher.
 */
export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${env.siteUrl}/#website`,
    name: siteConfig.name,
    url: absoluteUrl(locale, "/"),
    inLanguage: routing.locales,
    publisher: { "@id": businessId },
  };
}

/** schema.org BreadcrumbList for nested pages. Pass the trail from Home to the current page. */
export function breadcrumbJsonLd(locale: Locale, trail: { name: string; href: AppHref }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(locale, item.href),
    })),
  };
}
