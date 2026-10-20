import type { routing } from "@/i18n/routing";
import type messages from "@/messages/sq.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    // Albanian is the reference catalogue; scripts/check-messages.mjs keeps en.json in sync.
    Messages: typeof messages;
  }
}
