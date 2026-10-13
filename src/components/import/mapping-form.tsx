"use client";

import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Select } from "@/components/ui/select";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function MappingForm({
  action,
  idempotencyKey,
  batchId,
  headers,
  fields,
  mapping,
}: {
  action: Action;
  idempotencyKey: string;
  batchId: string;
  headers: string[];
  fields: { key: string; label: string; required: boolean; hint: string }[];
  mapping: Record<string, number>;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="batchId" value={batchId} />
      <FormMessages state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const posted = state.values?.[`map.${field.key}`];
          const value =
            posted ?? (mapping[field.key] !== undefined ? String(mapping[field.key]) : "");
          return (
            <Field
              key={field.key}
              id={`map-${field.key}`}
              label={field.label}
              required={field.required}
              hint={field.hint}
              error={errors[field.key]}
            >
              <Select name={`map.${field.key}`} defaultValue={value}>
                <option value="">{field.required ? "Zgjidhni kolonën…" : "Nuk përdoret"}</option>
                {headers.map((header, index) => (
                  <option key={index} value={String(index)}>
                    {header === "" ? `(kolona ${index + 1} pa titull)` : header}
                  </option>
                ))}
              </Select>
            </Field>
          );
        })}
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Duke rifreskuar…">
          Ruaj kolonat dhe rifresko parashikimin
        </SubmitButton>
      </div>
    </form>
  );
}
