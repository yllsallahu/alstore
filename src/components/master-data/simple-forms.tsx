"use client";

import { useActionState, type ReactNode } from "react";

import { Field } from "@/components/forms/field";
import { FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IDENTIFIER_LABELS } from "@/lib/master-data-labels";
import { KOSOVO_IDENTIFIER_TYPES } from "@/server/db/schema/enums";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/** Suspend or reinstate a customer with a mandatory reason. */
export function SuspensionForm({
  action,
  customerId,
  idempotencyKey,
  mode,
}: {
  action: Action;
  customerId: string;
  idempotencyKey: string;
  mode: "suspend" | "reinstate";
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="mode" value={mode} />
      <FormMessages state={state} />
      <Field
        id={`arsyeja-${mode}`}
        label={mode === "suspend" ? "Arsyeja e pezullimit" : "Arsyeja e heqjes së pezullimit"}
        required
        error={errors.reason}
        hint={
          mode === "suspend"
            ? "Pezullimi vlen menjëherë: klienti nuk mund të faturohet, edhe nëse ka shitje draft."
            : "Pas heqjes së pezullimit klienti mbetet i paverifikuar derisa të verifikohet përsëri."
        }
      >
        <Textarea
          name="reason"
          defaultValue={state.values?.reason ?? ""}
          maxLength={500}
          className="min-h-20"
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Duke ruajtur…">
          {mode === "suspend" ? "Pezullo klientin" : "Hiq pezullimin"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** ACCOUNTANT form for an identifier format/requirement rule (P-15). */
export function FormatRuleForm({
  action,
  idempotencyKey,
}: {
  action: Action;
  idempotencyKey: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <FormMessages state={state} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field id="identifierType" label="Numri" required error={errors.identifierType}>
          <Select name="identifierType" defaultValue={v?.identifierType ?? ""}>
            <option value="" disabled>
              Zgjidhni…
            </option>
            {KOSOVO_IDENTIFIER_TYPES.map((type) => (
              <option key={type} value={type}>
                {IDENTIFIER_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="minLength" label="Gjatësia minimale" required error={errors.minLength}>
          <Input
            name="minLength"
            inputMode="numeric"
            defaultValue={v?.minLength ?? ""}
            className="h-12"
          />
        </Field>
        <Field id="maxLength" label="Gjatësia maksimale" required error={errors.maxLength}>
          <Input
            name="maxLength"
            inputMode="numeric"
            defaultValue={v?.maxLength ?? ""}
            className="h-12"
          />
        </Field>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="digitsOnly"
            defaultChecked={v ? v.digitsOnly === "on" : true}
            className="accent-brand size-6"
          />
          Vetëm shifra
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            name="required"
            defaultChecked={v?.required === "on"}
            className="accent-brand size-6"
          />
          I detyrueshëm për çdo klient
        </label>
      </div>
      <Field
        id="sourceNote"
        label="Burimi i rregullit"
        required
        error={errors.sourceNote}
        hint="P.sh. dokumenti ose udhëzimi zyrtar nga i cili merret rregulli. Ruhet në historik."
      >
        <Textarea
          name="sourceNote"
          defaultValue={v?.sourceNote ?? ""}
          maxLength={500}
          className="min-h-20"
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>Ruaj rregullin</SubmitButton>
      </div>
    </form>
  );
}

/** One-button confirmation form (e.g. retire a rule). */
export function ConfirmForm({
  action,
  idempotencyKey,
  hidden,
  label,
  children,
}: {
  action: Action;
  idempotencyKey: string;
  hidden: Record<string, string>;
  label: string;
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormMessages state={state} />
      {children}
      <SubmitButton variant="secondary" size="md" pendingLabel="Duke ruajtur…">
        {label}
      </SubmitButton>
    </form>
  );
}
