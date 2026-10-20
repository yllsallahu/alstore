import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Kosovo uses the Central European time zone; fixing it avoids server/client formatting drift.
    timeZone: "Europe/Belgrade",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
