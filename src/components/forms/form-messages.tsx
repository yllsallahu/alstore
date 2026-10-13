import { Alert } from "@/components/ui/alert";

import type { FormState } from "./form-state";

/** Form-level error summary and the duplicate-warning list with an explicit confirmation. */
export function FormMessages({ state }: { state: FormState }) {
  const fieldCount = Object.keys(state.fieldErrors ?? {}).length;
  return (
    <>
      {state.formError && (
        <Alert tone="danger" role="alert" title={state.formError}>
          {fieldCount > 0 && (
            <p>Gabime në {fieldCount === 1 ? "1 fushë" : `${fieldCount} fusha`}.</p>
          )}
        </Alert>
      )}
      {state.success && (
        <Alert tone="success" role="status">
          {state.success}
        </Alert>
      )}
      {state.duplicates && state.duplicates.length > 0 && (
        <Alert tone="warn" role="alert" title="Ekziston një regjistër i ngjashëm">
          <p>Kontrolloni nëse po krijoni një dublikatë. Asgjë nuk u ruajt ende.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {state.duplicates.map((match) => (
              <li key={match.id}>
                <span className="font-medium">{match.label}</span> — {match.reason}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Nëse jeni të sigurt, shtypni sërish butonin e ruajtjes: konfirmimi regjistrohet në
            historik.
          </p>
        </Alert>
      )}
    </>
  );
}

/** Hidden inputs that acknowledge the duplicates the user has just been shown. */
export function AcknowledgedDuplicates({ state }: { state: FormState }) {
  return (
    <>
      {(state.duplicates ?? []).map((match) => (
        <input key={match.id} type="hidden" name="acknowledgedDuplicateIds" value={match.id} />
      ))}
    </>
  );
}
