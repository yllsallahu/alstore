import { describe, expect, it } from "vitest";

import { sanitizeDetails } from "@/server/audit/audit";
import { canonicalJson, requestHash } from "@/server/lib/canonical-hash";

describe("canonical request hash", () => {
  it("ignores key order and undefined members", () => {
    expect(canonicalJson({ b: 1, a: { d: [1, "x"], c: null }, e: undefined })).toBe(
      '{"a":{"c":null,"d":[1,"x"]},"b":1}',
    );
    expect(requestHash({ x: 1, y: 2 })).toBe(requestHash({ y: 2, x: 1 }));
  });

  it("distinguishes different payloads", () => {
    expect(requestHash({ qty: "1.000" })).not.toBe(requestHash({ qty: "1.0" }));
    expect(requestHash({ gateKey: "VG-01" })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses values that have no stable JSON form", () => {
    expect(() => canonicalJson({ n: Number.NaN })).toThrow();
    expect(() => canonicalJson({ n: 1n })).toThrow();
  });
});

describe("audit safe_details", () => {
  it("drops sensitive keys at any depth", () => {
    expect(
      sanitizeDetails({
        role: "ACCOUNTANT",
        password: "x",
        accessToken: "x",
        contact: { email: "x", phone: "x", city: "Prishtinë" },
        IBAN: "x",
      }),
    ).toEqual({ role: "ACCOUNTANT", contact: { city: "Prishtinë" } });
  });

  it("bounds strings, arrays and depth", () => {
    const result = sanitizeDetails({
      long: "a".repeat(500),
      list: Array.from({ length: 50 }, (_, index) => index),
      deep: { one: { two: { three: "x" } } },
      fn: () => 1,
    }) as Record<string, unknown>;
    expect((result.long as string).length).toBe(201);
    expect(result.list).toHaveLength(20);
    expect(result.deep).toEqual({ one: {} });
    expect(result).not.toHaveProperty("fn");
  });
});
