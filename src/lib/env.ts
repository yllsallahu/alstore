import { z } from "zod";

const boolFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());
const optionalString = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
    UI_PREVIEW: boolFlag,
    ISSUANCE_ENABLED: boolFlag,
    OFFICIAL_ATK_EXPORT_ENABLED: boolFlag,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
    /** Server-only connection of the running app (least-privilege `alstore_app` role). */
    DATABASE_URL: optionalString,
    /**
     * Development preview only: synthetic local users the preview acts as, because Supabase Auth
     * is BLOCKED (RG-03). Rejected unless APP_ENV=development, UI_PREVIEW=true and DATABASE_URL
     * points at a local database.
     */
    DEV_PREVIEW_DIRECTOR_ID: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
    DEV_PREVIEW_ACCOUNTANT_ID: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
  })
  .superRefine((env, ctx) => {
    if (env.DEV_PREVIEW_DIRECTOR_ID || env.DEV_PREVIEW_ACCOUNTANT_ID) {
      if (env.APP_ENV !== "development" || !env.UI_PREVIEW) {
        ctx.addIssue({
          code: "custom",
          path: ["DEV_PREVIEW_DIRECTOR_ID"],
          message:
            "DEV_PREVIEW_* users may only be set when APP_ENV=development and UI_PREVIEW=true",
        });
      }
      if (!env.DATABASE_URL || !isLocalDatabaseUrl(env.DATABASE_URL)) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "DEV_PREVIEW_* users require DATABASE_URL on 127.0.0.1/localhost",
        });
      }
    }
    if (env.UI_PREVIEW && env.APP_ENV !== "development") {
      ctx.addIssue({
        code: "custom",
        path: ["UI_PREVIEW"],
        message: "UI_PREVIEW may only be true when APP_ENV=development",
      });
    }
    // No issuance or official export exists before the phases and gates that implement them.
    if (env.ISSUANCE_ENABLED) {
      ctx.addIssue({
        code: "custom",
        path: ["ISSUANCE_ENABLED"],
        message: "ISSUANCE_ENABLED must be false: invoice issuance is not implemented",
      });
    }
    if (env.OFFICIAL_ATK_EXPORT_ENABLED) {
      ctx.addIssue({
        code: "custom",
        path: ["OFFICIAL_ATK_EXPORT_ENABLED"],
        message: "OFFICIAL_ATK_EXPORT_ENABLED must be false: official ATK export is not verified",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** True only for a PostgreSQL URL whose host is the local machine. */
export function isLocalDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      /^postgres(ql)?:$/.test(url.protocol) &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
