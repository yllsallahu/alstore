import type { Locale } from "next-intl";
import { brandAssets } from "@/config/brand";
import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "./urls";

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
    "@id": `${env.siteUrl}/#business`,
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
    areaServed: { "@type": "Country", name: countryName },
    brand: { "@type": "Brand", name: manufacturer.name, url: manufacturer.url },
    ...(logo && { logo: new URL(logo.src, `${env.siteUrl}/`).toString() }),
  };
}
