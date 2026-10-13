import { Alert } from "@/components/ui/alert";
import { UNAVAILABLE_MESSAGES, type RequestContext } from "@/server/auth/session";

/** Honest state when no verified user or database exists: nothing is shown or editable. */
export function Unavailable({
  context,
}: {
  context: Extract<RequestContext, { kind: "unavailable" }>;
}) {
  return (
    <Alert tone="warn" role="status" title="Të dhënat nuk janë të disponueshme">
      {UNAVAILABLE_MESSAGES[context.reason]}
    </Alert>
  );
}
