import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env";

describe("parseServerEnv", () => {
  it("defaults to development with every switch off", () => {
    expect(parseServerEnv({})).toMatchObject({
      APP_ENV: "development",
      UI_PREVIEW: false,
      ISSUANCE_ENABLED: false,
      OFFICIAL_ATK_EXPORT_ENABLED: false,
    });
  });

  it("treats empty optional Supabase values as absent", () => {
    const env = parseServerEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
  });

  it("allows the UI preview in development", () => {
    expect(parseServerEnv({ APP_ENV: "development", UI_PREVIEW: "true" }).UI_PREVIEW).toBe(true);
  });

  it.each(["staging", "production"])("rejects the UI preview in %s", (APP_ENV) => {
    expect(() => parseServerEnv({ APP_ENV, UI_PREVIEW: "true" })).toThrow(/UI_PREVIEW/);
  });

  it("rejects an unknown APP_ENV", () => {
    expect(() => parseServerEnv({ APP_ENV: "prod" })).toThrow(/APP_ENV/);
  });

  it("rejects non-boolean switch values", () => {
    expect(() => parseServerEnv({ UI_PREVIEW: "yes" })).toThrow(/UI_PREVIEW/);
  });

  it.each(["ISSUANCE_ENABLED", "OFFICIAL_ATK_EXPORT_ENABLED"])(
    "fails closed when %s is turned on",
    (key) => {
      expect(() => parseServerEnv({ [key]: "true" })).toThrow(new RegExp(key));
    },
  );

  it("rejects a malformed Supabase URL", () => {
    expect(() => parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
