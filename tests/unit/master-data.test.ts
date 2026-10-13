import { describe, expect, it } from "vitest";

import { kosovoToday, formatInstant, formatLocalDate } from "@/lib/dates";
import { decimalToInput, formatDecimal, parseDecimal } from "@/lib/decimal";
import { VERIFICATION_LABELS } from "@/lib/master-data-labels";
import {
  customerCreateSchema,
  fieldErrorsOf,
  productCreateSchema,
  supplierCreateSchema,
} from "@/lib/validation/master-data";
import { normalizeName } from "@/server/services/master-data/common";
import {
  checkAgainstRules,
  formatCheckPasses,
  type FormatRule,
} from "@/server/services/master-data/identifier-rules";
import {
  customerIdentityHash,
  deriveVerification,
  type VerificationEvent,
} from "@/server/services/master-data/verification-state";

describe("3-decimal parsing (no floats)", () => {
  it.each([
    ["12", "12.000"],
    ["12,5", "12.500"],
    ["12.5", "12.500"],
    ["0,125", "0.125"],
    ["007,1", "7.100"],
    [" 3 ", "3.000"],
    ["999999999999999,999", "999999999999999.999"],
  ])("%s → %s", (input, expected) => {
    expect(parseDecimal(input, { scale: 3 })).toEqual({ ok: true, value: expected });
  });

  it.each([
    ["", "EMPTY"],
    ["-1", "NEGATIVE"],
    ["1,2345", "SCALE"],
    ["1.234,5", "SEPARATORS"],
    ["1 234", "FORMAT"],
    ["1e3", "FORMAT"],
    ["abc", "FORMAT"],
    ["1000000000000000", "TOO_LARGE"],
  ])("%s is rejected (%s)", (input, error) => {
    expect(parseDecimal(input, { scale: 3 })).toEqual({ ok: false, error });
  });

  it("formats for Albanian display and back to input form", () => {
    expect(formatDecimal("1234567.5", 3).replace(/\s/g, " ")).toBe("1 234 567,500");
    expect(formatDecimal("0.125", 3)).toBe("0,125");
    expect(formatDecimal(null, 3)).toBe("—");
    expect(decimalToInput("12.500")).toBe("12,5");
    expect(decimalToInput("12.000")).toBe("12");
  });
});

describe("dates in Kosovo time", () => {
  it("uses Europe/Belgrade for the local date and display", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Kosovo (UTC+1 after DST ends).
    expect(kosovoToday(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    expect(formatLocalDate("2026-10-13")).toBe("13.10.2026");
    expect(formatInstant("2026-10-13T12:05:00Z")).toBe("13.10.2026 14:05");
  });
});

describe("product validation", () => {
  it("normalizes SKU and barcode to upper case and accepts kg/m²/copë only", () => {
    const parsed = productCreateSchema.parse({
      sku: " al-01 ",
      name: "  Profil   dritareje ",
      category: "PVC",
      unit: "M2",
      barcode: " abc-1234 ",
      referencePurchasePrice: "",
    });
    expect(parsed).toMatchObject({
      sku: "AL-01",
      name: "Profil dritareje",
      barcode: "ABC-1234",
      referencePurchasePrice: null,
      active: true,
    });
    const units = productCreateSchema.safeParse({
      sku: "A",
      name: "B",
      category: "PVC",
      unit: "M",
    });
    expect(units.success).toBe(false);
  });

  it("returns Albanian messages by field", () => {
    const result = productCreateSchema.safeParse({ sku: "", name: "x".repeat(201), unit: "KG" });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toEqual({
      sku: "Shkruani SKU-në.",
      name: "Lejohen deri në 200 shenja.",
      category: "Zgjidhni kategorinë.",
    });
  });
});

describe("party validation", () => {
  it("strips spaces from identifiers and drops empty ones", () => {
    const parsed = customerCreateSchema.parse({
      legalName: "Test SH.P.K.",
      identifiers: { BUSINESS_NUMBER: " 81 000 000 ", FISCAL_NUMBER: "" },
    });
    expect(parsed.identifiers).toEqual({
      BUSINESS_NUMBER: "81000000",
      FISCAL_NUMBER: null,
      VAT_NUMBER: null,
    });
  });

  it("only allows identifier types of the supplier's country", () => {
    const result = supplierCreateSchema.safeParse({
      legalName: "Furnitor",
      country: "XK",
      identifiers: { NIPT: "L1" },
    });
    expect(fieldErrorsOf(result.error!)).toMatchObject({
      "identifiers.NIPT": "Ky numër nuk vlen për shtetin e zgjedhur.",
    });
  });
});

describe("name normalization for duplicate warnings", () => {
  it.each([
    ["Alfa SH.P.K.", "alfa"],
    ["ALFA shpk", "alfa"],
    ["Çelësi Ëmbël L.L.C.", "celesi embel"],
    ["Beta  Sh.a.", "beta"],
    ["Alfa Trade", "alfa trade"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

const rule = (overrides: Partial<FormatRule>): FormatRule => ({
  id: "r",
  orgId: "o",
  identifierType: "FISCAL_NUMBER",
  required: false,
  digitsOnly: true,
  minLength: 9,
  maxLength: 9,
  sourceNote: "synthetic",
  status: "ACTIVE",
  createdBy: "u",
  createdAt: new Date(),
  retiredBy: null,
  retiredAt: null,
  ...overrides,
});

describe("identifier rules", () => {
  it("claims format validity only when every entered identifier has a passing rule", () => {
    const rules = [rule({})];
    expect(formatCheckPasses({ FISCAL_NUMBER: "123456789" }, rules)).toBe(true);
    expect(formatCheckPasses({ FISCAL_NUMBER: "123456789", VAT_NUMBER: "1" }, rules)).toBe(false);
    expect(formatCheckPasses({ FISCAL_NUMBER: "12345678A" }, rules)).toBe(false);
    expect(formatCheckPasses({ FISCAL_NUMBER: "123456789" }, [])).toBe(false);
  });

  it("explains violations in Albanian", () => {
    expect(checkAgainstRules({}, [rule({ required: true })])).toEqual({
      "identifiers.FISCAL_NUMBER": "Ky numër kërkohet sipas rregullave të kontabilistit.",
    });
    expect(
      checkAgainstRules({ FISCAL_NUMBER: "123" }, [rule({ minLength: 8, maxLength: 10 })]),
    ).toEqual({
      "identifiers.FISCAL_NUMBER": "Sipas rregullave të kontabilistit duhet të ketë 8–10 shenja.",
    });
  });
});

describe("verification state derivation", () => {
  const hash = customerIdentityHash("Klient SH.P.K.", { BUSINESS_NUMBER: "1" });
  const other = customerIdentityHash("Klient SH.P.K.", { BUSINESS_NUMBER: "2" });
  let t = 0;
  const event = (
    method: string,
    result = "PASSED",
    identityHash = hash,
    validUntil: string | null = null,
  ): VerificationEvent => ({
    method,
    result,
    identityHash,
    validUntil,
    verifiedAt: new Date(Date.UTC(2026, 9, 1) + (t += 1000)),
  });
  const today = "2026-10-13";

  it("is UNVERIFIED with no history and never OFFICIALLY_VERIFIED", () => {
    expect(deriveVerification([], hash, today).state).toBe("UNVERIFIED");
  });

  it("FORMAT_VALID < MANUALLY_VERIFIED; a later failed manual check wins", () => {
    expect(deriveVerification([event("FORMAT_CHECK")], hash, today).state).toBe("FORMAT_VALID");
    const manual = [event("FORMAT_CHECK"), event("MANUAL_EVIDENCE")];
    expect(deriveVerification(manual, hash, today).state).toBe("MANUALLY_VERIFIED");
    expect(
      deriveVerification([...manual, event("MANUAL_EVIDENCE", "FAILED")], hash, today).state,
    ).toBe("UNVERIFIED");
  });

  it("ignores checks for an earlier identity and reports them as stale", () => {
    const derived = deriveVerification([event("MANUAL_EVIDENCE", "PASSED", other)], hash, today);
    expect(derived).toMatchObject({ state: "UNVERIFIED", staleAfterIdentityChange: true });
  });

  it("expires manual verification after valid_until (Kosovo date)", () => {
    const events = [event("MANUAL_EVIDENCE", "PASSED", hash, "2026-10-12")];
    expect(deriveVerification(events, hash, today)).toMatchObject({
      state: "UNVERIFIED",
      expired: true,
    });
    expect(deriveVerification(events, hash, "2026-10-12").state).toBe("MANUALLY_VERIFIED");
  });

  it("suspension overrides everything; reinstatement needs a fresh check", () => {
    const base = [event("MANUAL_EVIDENCE"), event("SUSPENSION")];
    expect(deriveVerification(base, hash, today).state).toBe("SUSPENDED");
    const reinstated = [...base, event("REINSTATEMENT")];
    expect(deriveVerification(reinstated, hash, today).state).toBe("UNVERIFIED");
    expect(deriveVerification([...reinstated, event("MANUAL_EVIDENCE")], hash, today).state).toBe(
      "MANUALLY_VERIFIED",
    );
  });

  it("never describes format validity as a registry check", () => {
    expect(VERIFICATION_LABELS.FORMAT_VALID.hint).toContain(
      "Nuk është kontroll në regjistrin zyrtar",
    );
    expect(VERIFICATION_LABELS.OFFICIALLY_VERIFIED.hint).toContain("nuk ekziston asnjë lidhje");
  });

  it("hashes identity independently of identifier key order and spacing", () => {
    expect(customerIdentityHash(" Klient  SH.P.K. ", { BUSINESS_NUMBER: "1" })).toBe(hash);
    expect(customerIdentityHash("A", { VAT_NUMBER: "2", BUSINESS_NUMBER: "1" })).toBe(
      customerIdentityHash("A", { BUSINESS_NUMBER: "1", VAT_NUMBER: "2" }),
    );
  });
});
