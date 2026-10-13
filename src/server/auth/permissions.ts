import type { ROLES } from "@/server/db/schema/enums";

export type Role = (typeof ROLES)[number];

/** A loaded, ACTIVE actor. `mfaVerified` comes from the verified session (AAL2), never the client. */
export interface Actor {
  userId: string;
  orgId: string;
  role: Role;
  mfaVerified: boolean;
}

type Grant = "ALLOW" | "DENY";

interface PermissionRule {
  DIRECTOR: Grant;
  ACCOUNTANT: Grant;
  /** Writes require MFA (rules.md §4). */
  write: boolean;
  /** ✅¹ rows: the change takes effect only after the other user approves (SOD-3). */
  fourEyes?: true;
}

const both = (write: boolean, fourEyes?: true): PermissionRule => ({
  DIRECTOR: "ALLOW",
  ACCOUNTANT: "ALLOW",
  write,
  ...(fourEyes ? { fourEyes } : {}),
});
const directorOnly: PermissionRule = { DIRECTOR: "ALLOW", ACCOUNTANT: "DENY", write: true };
const accountantOnly: PermissionRule = { DIRECTOR: "DENY", ACCOUNTANT: "ALLOW", write: true };

/** docs/ROLE_PERMISSION_MATRIX.md §2. P-98 is split into its request and approve halves. */
export const PERMISSIONS = {
  "P-01": directorOnly,
  "P-02": both(false),
  "P-03": both(true, true),
  "P-04": both(true, true),
  "P-05": { ...accountantOnly, fourEyes: true },
  "P-06": directorOnly,
  "P-07": both(true),
  "P-10": both(true),
  "P-11": both(true),
  "P-12": both(true),
  "P-13": both(true),
  "P-14": both(true, true),
  "P-15": accountantOnly,
  "P-16": both(false),
  "P-20": both(true),
  "P-21": both(true),
  "P-22": both(true),
  "P-23": accountantOnly,
  "P-24": directorOnly,
  "P-25": both(true),
  "P-26": accountantOnly,
  "P-27": both(true),
  "P-28": accountantOnly,
  "P-29": directorOnly,
  "P-30": both(false),
  "P-31": both(true),
  "P-40": both(false),
  "P-41": both(true),
  "P-42": both(true, true),
  "P-43": both(false),
  "P-44": both(false),
  "P-50": both(true),
  "P-51": both(true),
  "P-52": both(false),
  "P-60": both(true),
  "P-61": accountantOnly,
  "P-62": both(true),
  "P-63": both(true),
  "P-64": both(true, true),
  "P-70": both(true),
  "P-71": both(true),
  "P-72": both(true, true),
  "P-73": accountantOnly,
  "P-74": both(true),
  "P-80": both(true),
  "P-81": both(true),
  "P-82": both(true),
  "P-83": both(true),
  "P-84": both(true, true),
  "P-90": accountantOnly,
  "P-91": both(true),
  "P-92": accountantOnly,
  "P-93": directorOnly,
  "P-94": both(true),
  "P-95": directorOnly,
  "P-96": both(true),
  "P-97": directorOnly,
  "P-98.REQUEST": accountantOnly,
  "P-98.APPROVE": directorOnly,
  "P-100": both(false),
  "P-101": both(false),
  "P-102": { DIRECTOR: "DENY", ACCOUNTANT: "DENY", write: true },
} as const satisfies Record<string, PermissionRule>;

export type Permission = keyof typeof PERMISSIONS;

export type AuthorizationCode =
  "FORBIDDEN" | "ACCOUNT_INACTIVE" | "MFA_REQUIRED" | "FOUR_EYES_REQUIRED";

const MESSAGES: Record<AuthorizationCode, string> = {
  FORBIDDEN: "Nuk keni leje për këtë veprim.",
  ACCOUNT_INACTIVE: "Llogaria juaj nuk është aktive.",
  MFA_REQUIRED: "Ky veprim kërkon verifikimin me dy hapa (MFA).",
  FOUR_EYES_REQUIRED: "Ky veprim duhet të miratohet nga përdoruesi tjetër.",
};

export class AuthorizationError extends Error {
  readonly code: AuthorizationCode;
  readonly permission: string;

  constructor(code: AuthorizationCode, permission: string) {
    super(MESSAGES[code]);
    this.name = "AuthorizationError";
    this.code = code;
    this.permission = permission;
  }
}

export interface AuthorizeContext {
  /** Required for P-51 (OWN-04). Missing → fail closed for the ACCOUNTANT. */
  invoiceIssuers?: "BOTH" | "DIRECTOR_ONLY";
}

export function isAllowed(role: Role, permission: Permission, context: AuthorizeContext = {}) {
  if (PERMISSIONS[permission][role] !== "ALLOW") return false;
  if (permission === "P-51" && role === "ACCOUNTANT") return context.invoiceIssuers === "BOTH";
  return true;
}

export function authorize(actor: Actor, permission: Permission, context: AuthorizeContext = {}) {
  if (!isAllowed(actor.role, permission, context)) {
    throw new AuthorizationError("FORBIDDEN", permission);
  }
  if (PERMISSIONS[permission].write && !actor.mfaVerified) {
    throw new AuthorizationError("MFA_REQUIRED", permission);
  }
}

/** SOD-3: on ✅¹ rows the approver must be a different user than the requester. */
export function assertFourEyes(approver: Actor, requesterId: string, permission: Permission) {
  if (!("fourEyes" in PERMISSIONS[permission])) {
    throw new Error(`${permission} is not a four-eyes permission`);
  }
  if (approver.userId === requesterId) {
    throw new AuthorizationError("FOUR_EYES_REQUIRED", permission);
  }
}

/** Gates that need an approval from each role before they count as APPROVED. */
export const JOINT_GATES = new Set(["VG-06", "VG-11"]);

/**
 * P-07 refinement (VAT_COMPLIANCE_GATES, RELEASE_GATES): RG-xx and VG-18 → DIRECTOR;
 * VG-06 and VG-11 → both roles jointly; every other VG gate → ACCOUNTANT.
 */
export function canApproveGate(role: Role, gateKey: string): boolean {
  if (!/^(VG|RG)-[0-9]{2}$/.test(gateKey)) return false;
  if (gateKey.startsWith("RG-") || gateKey === "VG-18") return role === "DIRECTOR";
  if (JOINT_GATES.has(gateKey)) return true;
  return role === "ACCOUNTANT";
}
