import { z } from "zod";

/**
 * Server environment, validated once at module load. Import only from Server
 * Components, route handlers and metadata functions: these variables are not
 * exposed to the browser (no NEXT_PUBLIC_ prefix).
 */

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  SITE_URL: z.preprocess(
    emptyToUndefined,
    z
      .url({ protocol: /^https?$/ })
      .default("https://www.alstore-ks.com")
      .transform((url) => url.replace(/\/+$/, "")),
  ),
  SITE_INDEXABLE: z.preprocess(
    emptyToUndefined,
    z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  ),
});

const parsed = envSchema.safeParse({
  SITE_URL: process.env.SITE_URL,
  SITE_INDEXABLE: process.env.SITE_INDEXABLE,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
}

export const env = {
  /** Absolute origin without trailing slash, e.g. https://www.alstore-ks.com */
  siteUrl: parsed.data.SITE_URL,
  /** True only on the approved production deployment. */
  indexable: parsed.data.SITE_INDEXABLE,
} as const;
