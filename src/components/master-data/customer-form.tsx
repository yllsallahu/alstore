"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { AcknowledgedDuplicates, FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IDENTIFIER_LABELS } from "@/lib/master-data-labels";
import { KOSOVO_IDENTIFIER_TYPES } from "@/server/db/schema/enums";

export interface CustomerFormDefaults {
  legalName: string;
  identifiers: Partial<Record<string, string>>;
  address: string;
  city: string;
  active: boolean;
}

export interface RuleHint {
  identifierType: string;
  required: boolean;
  digitsOnly: boolean;
  minLength: number;
  maxLength: number;
}

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

function ruleText(rule: RuleHint | undefined) {
  if (!rule) return "Pa rregull formati të miratuar: formati nuk kontrollohet.";
  const length =
    rule.minLength === rule.maxLength ? `${rule.minLength}` : `${rule.minLength}–${rule.maxLength}`;
  return `Rregulli i kontabilistit: ${length} ${rule.digitsOnly ? "shifra" : "shenja"}${rule.required ? ", i detyrueshëm" : ""}.`;
}

export function CustomerForm({
  mode,
  action,
  idempotencyKey,
  defaults,
  rules,
  customerId,
  version,
  cancelHref,
}: {
  mode: "create" | "edit";
  action: Action;
  idempotencyKey: string;
  defaults: CustomerFormDefaults;
  rules: RuleHint[];
  customerId?: string;
  version?: number;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  const text = (name: "legalName" | "address" | "city") => (v ? (v[name] ?? "") : defaults[name]);
  const identifier = (type: string) =>
    v ? (v[`identifiers.${type}`] ?? "") : (defaults.identifiers[type] ?? "");
  const active = v ? v.active === "on" : defaults.active;

  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {customerId && <input type="hidden" name="customerId" value={customerId} />}
      {version !== undefined && <input type="hidden" name="expectedVersion" value={version} />}
      <AcknowledgedDuplicates state={state} />
      <FormMessages state={state} />

      <Field
        id="legalName"
        label="Emri ligjor i biznesit"
        required
        error={errors.legalName}
        hint="Siç shkruhet në certifikatën e regjistrimit të biznesit."
      >
        <Input name="legalName" defaultValue={text("legalName")} maxLength={200} className="h-12" />
      </Field>

      <fieldset
        className="border-line rounded-md border p-4"
        aria-describedby={errors.identifiers ? "identifikuesit-gabim" : "identifikuesit-ndihme"}
      >
        <legend className="px-1 text-sm font-medium">
          Numrat identifikues të biznesit{" "}
          <span className="text-danger" aria-hidden>
            *
          </span>
          <span className="sr-only"> (të paktën një)</span>
        </legend>
        <p id="identifikuesit-ndihme" className="text-ink-muted mb-3 text-sm">
          Shkruani të paktën një. Cilat janë të detyrueshme vendos kontabilisti.
        </p>
        {errors.identifiers && (
          <p id="identifikuesit-gabim" className="text-danger mb-3 text-sm font-medium">
            {errors.identifiers}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {KOSOVO_IDENTIFIER_TYPES.map((type) => {
            const rule = rules.find((r) => r.identifierType === type);
            return (
              <Field
                key={type}
                id={`identifiers-${type}`}
                label={IDENTIFIER_LABELS[type]}
                required={rule?.required}
                error={errors[`identifiers.${type}`]}
                hint={ruleText(rule)}
              >
                <Input
                  name={`identifiers.${type}`}
                  defaultValue={identifier(type)}
                  inputMode={rule?.digitsOnly ? "numeric" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 font-mono"
                />
              </Field>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="address"
          label="Adresa e faturimit"
          error={errors.address}
          hint="Rruga dhe numri. Fushat e detyrueshme të faturës vendosen nga kontabilisti."
        >
          <Input name="address" defaultValue={text("address")} maxLength={300} className="h-12" />
        </Field>
        <Field id="city" label="Qyteti" error={errors.city}>
          <Input name="city" defaultValue={text("city")} maxLength={100} className="h-12" />
        </Field>
      </div>

      <label className="flex min-h-12 items-center gap-3 text-base">
        <input
          type="checkbox"
          name="active"
          defaultChecked={active}
          className="accent-brand size-6 shrink-0"
        />
        Klient aktiv
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Anulo
        </Link>
        <SubmitButton>{mode === "create" ? "Ruaj klientin" : "Ruaj ndryshimet"}</SubmitButton>
      </div>
    </form>
  );
}
