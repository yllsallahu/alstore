"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UNIT_LABELS } from "@/lib/master-data-labels";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function UnitChangeRequestForm({
  action,
  productId,
  currentUnit,
  idempotencyKey,
}: {
  action: Action;
  productId: string;
  currentUnit: string;
  idempotencyKey: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="productId" value={productId} />
      <FormMessages state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="toUnit" label="Njësia e re" required error={errors.toUnit}>
          <Select name="toUnit" defaultValue={state.values?.toUnit ?? ""}>
            <option value="" disabled>
              Zgjidhni…
            </option>
            {Object.entries(UNIT_LABELS)
              .filter(([code]) => code !== currentUnit)
              .map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
          </Select>
        </Field>
        <Field
          id="reason"
          label="Arsyeja"
          required
          error={errors.reason}
          hint="Të paktën 10 shenja. Regjistrohet në historik."
          className="md:col-span-2"
        >
          <Textarea name="reason" defaultValue={state.values?.reason ?? ""} maxLength={500} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Duke dërguar…">
          Kërko miratimin
        </SubmitButton>
      </div>
    </form>
  );
}

export function UnitChangeDecisionForm({
  action,
  productId,
  changeId,
  idempotencyKey,
  isRequester,
}: {
  action: Action;
  productId: string;
  changeId: string;
  idempotencyKey: string;
  isRequester: boolean;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="changeId" value={changeId} />
      <FormMessages state={state} />
      {isRequester ? (
        <>
          <p className="text-ink-muted text-sm">
            Ju e bëtë këtë kërkesë. Miratimi ose refuzimi bëhet nga përdoruesi tjetër.
          </p>
          <div className="flex justify-end">
            <SubmitButton
              name="decision"
              value="CANCEL"
              variant="secondary"
              pendingLabel="Duke anuluar…"
            >
              Anulo kërkesën
            </SubmitButton>
          </div>
        </>
      ) : (
        <>
          <Field id={`koment-${changeId}`} label="Koment (opsional)">
            <Textarea name="comment" maxLength={500} className="min-h-16" />
          </Field>
          <p className="text-ink-muted text-sm">
            Miratimi zbatohet vetëm nëse gjendja e stokut është 0,000 dhe produkti nuk është në
            asnjë dokument të hapur. Sasitë nuk konvertohen.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <SubmitButton
              name="decision"
              value="REJECT"
              variant="secondary"
              pendingLabel="Duke ruajtur…"
            >
              Refuzo
            </SubmitButton>
            <SubmitButton name="decision" value="APPROVE" pendingLabel="Duke zbatuar…">
              Mirato dhe zbato
            </SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
