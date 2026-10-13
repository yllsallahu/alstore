import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { VERIFICATION_LABELS, type VerificationState } from "@/lib/master-data-labels";

const TONES: Record<VerificationState, BadgeTone> = {
  UNVERIFIED: "neutral",
  FORMAT_VALID: "info",
  MANUALLY_VERIFIED: "success",
  OFFICIALLY_VERIFIED: "success",
  SUSPENDED: "danger",
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  return (
    <StatusBadge tone={TONES[state]} title={VERIFICATION_LABELS[state].hint}>
      {VERIFICATION_LABELS[state].label}
    </StatusBadge>
  );
}
