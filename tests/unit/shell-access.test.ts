import { describe, expect, it } from "vitest";

import { getShellAccess } from "@/server/auth/shell-access";

describe("getShellAccess", () => {
  it("denies access by default", () => {
    expect(getShellAccess({ APP_ENV: "development", UI_PREVIEW: false })).toEqual({
      allowed: false,
    });
  });

  it("allows only the development UI preview", () => {
    expect(getShellAccess({ APP_ENV: "development", UI_PREVIEW: true })).toEqual({
      allowed: true,
      mode: "preview",
    });
  });

  it.each(["staging", "production"] as const)(
    "denies %s even if the preview flag leaks",
    (APP_ENV) => {
      expect(getShellAccess({ APP_ENV, UI_PREVIEW: true })).toEqual({ allowed: false });
    },
  );
});
