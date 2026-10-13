import type { VerificationState } from "@/lib/master-data-labels";
import { canonicalJson, sha256Hex } from "@/server/lib/canonical-hash";

export interface VerificationEvent {
  method: string;
  result: string;
  identityHash: string;
  verifiedAt: Date;
  validUntil: string | null;
}

export interface DerivedVerification {
  state: VerificationState;
  /** A manual verification exists for the current identity but its validity ended. */
  expired: boolean;
  /** Verification exists only for an earlier legal name / identifiers. */
  staleAfterIdentityChange: boolean;
  lastManual: VerificationEvent | null;
}

/** Identity verified = legal name + identifiers. Billing address changes do not invalidate it. */
export function customerIdentityHash(legalName: string, identifiers: Record<string, unknown>) {
  return sha256Hex(
    canonicalJson({ legalName: legalName.trim().replace(/\s+/g, " "), identifiers }),
  );
}

/**
 * Derives the state from the append-only history (DOMAIN_MODEL §3.3). Rules:
 * - the latest SUSPENSION/REINSTATEMENT decides suspension; checks recorded before it no longer
 *   count, so a reinstated customer must be verified again;
 * - only checks for the CURRENT identity hash count;
 * - the latest manual check wins: PASSED (and not expired) → MANUALLY_VERIFIED, FAILED → UNVERIFIED;
 * - otherwise a passed format check → FORMAT_VALID (never enough to invoice);
 * - OFFICIALLY_VERIFIED is never derived: no trusted registry integration exists.
 */
export function deriveVerification(
  events: VerificationEvent[],
  currentHash: string,
  today: string,
): DerivedVerification {
  const ordered = [...events].sort((a, b) => a.verifiedAt.getTime() - b.verifiedAt.getTime());
  let boundary = -1;
  ordered.forEach((event, index) => {
    if (event.method === "SUSPENSION" || event.method === "REINSTATEMENT") boundary = index;
  });
  if (boundary >= 0 && ordered[boundary]!.method === "SUSPENSION") {
    return {
      state: "SUSPENDED",
      expired: false,
      staleAfterIdentityChange: false,
      lastManual: null,
    };
  }

  const relevant = ordered.slice(boundary + 1);
  const checks = relevant.filter(
    (e) => e.method === "MANUAL_EVIDENCE" || e.method === "FORMAT_CHECK",
  );
  const current = checks.filter((e) => e.identityHash === currentHash);
  const stale = checks.length > 0 && current.length === 0;

  const manual = current.filter((e) => e.method === "MANUAL_EVIDENCE");
  const lastManual = manual.at(-1) ?? null;
  if (lastManual?.result === "FAILED") {
    return { state: "UNVERIFIED", expired: false, staleAfterIdentityChange: false, lastManual };
  }
  if (lastManual?.result === "PASSED") {
    if (!lastManual.validUntil || lastManual.validUntil >= today) {
      return {
        state: "MANUALLY_VERIFIED",
        expired: false,
        staleAfterIdentityChange: false,
        lastManual,
      };
    }
    const format = current.some((e) => e.method === "FORMAT_CHECK" && e.result === "PASSED");
    return {
      state: format ? "FORMAT_VALID" : "UNVERIFIED",
      expired: true,
      staleAfterIdentityChange: false,
      lastManual,
    };
  }
  const lastFormat = current.filter((e) => e.method === "FORMAT_CHECK").at(-1);
  return {
    state: lastFormat?.result === "PASSED" ? "FORMAT_VALID" : "UNVERIFIED",
    expired: false,
    staleAfterIdentityChange: stale,
    lastManual: null,
  };
}

/** States that may receive an issued tax invoice once VG-07 is APPROVED. */
export const INVOICEABLE_STATES: readonly VerificationState[] = ["MANUALLY_VERIFIED"];
