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
    /** Google Maps pin for the AL STORE premises (owner, 2026-10-30). */
    mapUrl: "https://maps.app.goo.gl/5uWMXwRzHL4Tz1Hd7",
    /** Google Maps embed of the same pin (owner, 2026-10-30). */
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5895.157446671279!2d21.368421546565862!3d42.37281656098295!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x13548b1f5db3c479%3A0x5f3d23bd78f9ab24!2sAl%20Store!5e0!3m2!1sen!2s!4v1793364956198!5m2!1sen!2s",
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
