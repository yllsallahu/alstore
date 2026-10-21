/**
 * Verified AL STORE business facts. Single source of truth for contact data,
 * structured data and footer content.
 *
 * Every value here was supplied by the business owner (see docs/CONTENT_SOURCES.md).
 * Do not add facts that are not on that list: no opening hours, VAT numbers,
 * coordinates, social profiles or second phone numbers until the owner confirms them.
 * Locale-specific wording (country names, sentences) belongs in src/messages/.
 */
export const siteConfig = {
  name: "AL STORE",
  contact: {
    phone: {
      display: "+383 44 177 351",
      e164: "+38344177351",
    },
    email: "alstore.shpk@gmail.com",
  },
  address: {
    street: "Isa Boletini",
    locality: "Radivojc",
    postalCode: "61000",
    /** ISO 3166-1 alpha-2 user-assigned code used for Kosovo by schema.org consumers. */
    countryCode: "XK",
  },
  /** Cumulative AL STORE supply activity, 2018 to October 2026 (owner, 2026-10-21). Not annual. */
  supplyStats: [
    { key: "partnershipYears", value: "8+" },
    { key: "supplyTrucks", value: "100+" },
    { key: "aluminiumTonnes", value: "120+" },
  ],
  manufacturer: {
    name: "EVEREST",
    url: "https://everest.al/",
  },
} as const;
