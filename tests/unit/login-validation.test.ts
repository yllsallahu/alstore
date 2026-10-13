import { describe, expect, it } from "vitest";

import { validateLogin } from "@/lib/validation/login";

describe("validateLogin", () => {
  it("requires both fields with Albanian messages", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      ok: false,
      fieldErrors: { email: "Shkruani email-in.", password: "Shkruani fjalëkalimin." },
    });
  });

  it("rejects a malformed email", () => {
    const result = validateLogin({ email: "jo-email", password: "x" });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: "Email-i nuk është i vlefshëm.", password: undefined },
    });
  });

  it("rejects missing (null) form values", () => {
    expect(validateLogin({ email: null, password: null }).ok).toBe(false);
  });

  it("accepts and trims a valid synthetic email", () => {
    expect(validateLogin({ email: "  test@example.com ", password: "x" })).toEqual({
      ok: true,
      email: "test@example.com",
    });
  });
});
