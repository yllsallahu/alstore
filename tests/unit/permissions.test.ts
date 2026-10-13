import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  PERMISSIONS,
  assertFourEyes,
  authorize,
  canApproveGate,
  isAllowed,
  type Actor,
  type Permission,
} from "@/server/auth/permissions";

const director: Actor = { userId: "d", orgId: "o", role: "DIRECTOR", mfaVerified: true };
const accountant: Actor = { userId: "a", orgId: "o", role: "ACCOUNTANT", mfaVerified: true };

const DIRECTOR_ONLY: Permission[] = [
  "P-01",
  "P-06",
  "P-24",
  "P-29",
  "P-93",
  "P-95",
  "P-97",
  "P-98.APPROVE",
];
const ACCOUNTANT_ONLY: Permission[] = [
  "P-05",
  "P-23",
  "P-26",
  "P-15",
  "P-28",
  "P-61",
  "P-73",
  "P-90",
  "P-92",
  "P-98.REQUEST",
];
const FOUR_EYES: Permission[] = ["P-03", "P-04", "P-05", "P-14", "P-42", "P-64", "P-72", "P-84"];
const READ_ONLY: Permission[] = ["P-02", "P-16", "P-30", "P-40", "P-43", "P-52", "P-100", "P-101"];

const codeOf = (fn: () => void) => {
  try {
    fn();
    return "OK";
  } catch (error) {
    return error instanceof AuthorizationError ? error.code : "OTHER";
  }
};

describe("permission matrix (ROLE_PERMISSION_MATRIX §2)", () => {
  it.each(DIRECTOR_ONLY)("%s: DIRECTOR allowed, ACCOUNTANT denied", (permission) => {
    expect(codeOf(() => authorize(director, permission))).toBe("OK");
    expect(codeOf(() => authorize(accountant, permission))).toBe("FORBIDDEN");
  });

  it.each(ACCOUNTANT_ONLY)("%s: ACCOUNTANT allowed, DIRECTOR denied", (permission) => {
    expect(codeOf(() => authorize(accountant, permission))).toBe("OK");
    expect(codeOf(() => authorize(director, permission))).toBe("FORBIDDEN");
  });

  it("P-102: nobody may delete an issued or posted document", () => {
    expect(codeOf(() => authorize(director, "P-102"))).toBe("FORBIDDEN");
    expect(codeOf(() => authorize(accountant, "P-102"))).toBe("FORBIDDEN");
  });

  it("every other row is allowed for both roles", () => {
    const special = new Set<string>([...DIRECTOR_ONLY, ...ACCOUNTANT_ONLY, "P-102", "P-51"]);
    const shared = (Object.keys(PERMISSIONS) as Permission[]).filter((key) => !special.has(key));
    expect(shared.length).toBeGreaterThan(30);
    for (const permission of shared) {
      expect(isAllowed("DIRECTOR", permission), permission).toBe(true);
      expect(isAllowed("ACCOUNTANT", permission), permission).toBe(true);
    }
  });

  it("marks exactly the ✅¹ rows as four-eyes", () => {
    const flagged = (Object.keys(PERMISSIONS) as Permission[]).filter(
      (key) => "fourEyes" in PERMISSIONS[key],
    );
    expect(flagged.sort()).toEqual([...FOUR_EYES].sort());
  });

  it("P-51 follows the invoice-issuers setting and fails closed without it", () => {
    expect(isAllowed("DIRECTOR", "P-51")).toBe(true);
    expect(isAllowed("ACCOUNTANT", "P-51", { invoiceIssuers: "BOTH" })).toBe(true);
    expect(isAllowed("ACCOUNTANT", "P-51", { invoiceIssuers: "DIRECTOR_ONLY" })).toBe(false);
    expect(isAllowed("ACCOUNTANT", "P-51")).toBe(false);
  });
});

describe("MFA", () => {
  it("requires MFA for writes but not for reads", () => {
    const noMfa: Actor = { ...director, mfaVerified: false };
    expect(codeOf(() => authorize(noMfa, "P-50"))).toBe("MFA_REQUIRED");
    for (const permission of READ_ONLY) {
      expect(
        codeOf(() => authorize(noMfa, permission)),
        permission,
      ).toBe("OK");
    }
  });

  it("checks the role before MFA so denied roles learn nothing more", () => {
    expect(codeOf(() => authorize({ ...accountant, mfaVerified: false }, "P-01"))).toBe(
      "FORBIDDEN",
    );
  });

  it("uses Albanian messages", () => {
    try {
      authorize({ ...director, mfaVerified: false }, "P-50");
    } catch (error) {
      expect((error as Error).message).toBe("Ky veprim kërkon verifikimin me dy hapa (MFA).");
    }
  });
});

describe("four-eyes (SOD-3)", () => {
  it.each(FOUR_EYES)("%s: requester cannot approve their own request", (permission) => {
    expect(codeOf(() => assertFourEyes(director, director.userId, permission))).toBe(
      "FOUR_EYES_REQUIRED",
    );
    expect(codeOf(() => assertFourEyes(director, accountant.userId, permission))).toBe("OK");
  });

  it("refuses to treat a single-person permission as four-eyes", () => {
    expect(() => assertFourEyes(director, accountant.userId, "P-50")).toThrow(
      "not a four-eyes permission",
    );
  });
});

describe("P-07 gate approvers", () => {
  it.each([
    ["RG-00", true, false],
    ["RG-03", true, false],
    ["VG-18", true, false],
    ["VG-06", true, true],
    ["VG-11", true, true],
    ["VG-01", false, true],
    ["VG-12", false, true],
  ] as const)("%s → director %s, accountant %s", (gate, directorOk, accountantOk) => {
    expect(canApproveGate("DIRECTOR", gate)).toBe(directorOk);
    expect(canApproveGate("ACCOUNTANT", gate)).toBe(accountantOk);
  });

  it("rejects malformed gate keys", () => {
    expect(canApproveGate("DIRECTOR", "RG-1")).toBe(false);
    expect(canApproveGate("ACCOUNTANT", "XX-01")).toBe(false);
  });
});
