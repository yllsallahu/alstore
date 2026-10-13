"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/forms/field";
import { AcknowledgedDuplicates, FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { COUNTRY_LABELS, IDENTIFIER_LABELS } from "@/lib/master-data-labels";
import { SUPPLIER_IDENTIFIER_TYPES } from "@/server/db/schema/enums";

export interface SupplierFormDefaults {
  legalName: string;
  country: string;
  identifiers: Partial<Record<string, string>>;
  address: string;
  city: string;
  invoiceReferenceNote: string;
  active: boolean;
}

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function SupplierForm({
  mode,
  action,
  idempotencyKey,
  defaults,
  supplierId,
  version,
  cancelHref,
}: {
  mode: "create" | "edit";
  action: Action;
  idempotencyKey: string;
  defaults: SupplierFormDefaults;
  supplierId?: string;
  version?: number;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  const [country, setCountry] = useState(v?.country ?? defaults.country);
  const text = (name: "legalName" | "address" | "city" | "invoiceReferenceNote") =>
    v ? (v[name] ?? "") : defaults[name];
  const identifier = (type: string) =>
    v ? (v[`identifiers.${type}`] ?? "") : (defaults.identifiers[type] ?? "");
  const types: readonly string[] =
    country === "XK" || country === "AL" ? SUPPLIER_IDENTIFIER_TYPES[country] : [];
  const active = v ? v.active === "on" : defaults.active;

  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {supplierId && <input type="hidden" name="supplierId" value={supplierId} />}
      {version !== undefined && <input type="hidden" name="expectedVersion" value={version} />}
      <AcknowledgedDuplicates state={state} />
      <FormMessages state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="legalName"
          label="Emri ligjor i furnitorit"
          required
          error={errors.legalName}
          className="md:col-span-2"
        >
          <Input
            name="legalName"
            defaultValue={text("legalName")}
            maxLength={200}
            className="h-12"
          />
        </Field>
        <Field id="country" label="Shteti" required error={errors.country}>
          <Select
            name="country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="" disabled>
              Zgjidhni…
            </option>
            {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Monedha e faturave</span>
          <p className="border-line bg-canvas flex h-12 items-center rounded-md border px-3">EUR</p>
          <p className="text-ink-muted text-sm">
            Faturat e furnitorëve regjistrohen vetëm në euro.
          </p>
        </div>
      </div>

      <fieldset className="border-line rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">
          Numrat identifikues{" "}
          <span className="text-danger" aria-hidden>
            *
          </span>
          <span className="sr-only"> (të paktën një)</span>
        </legend>
        {errors.identifiers && (
          <p className="text-danger mb-3 text-sm font-medium">{errors.identifiers}</p>
        )}
        {types.length === 0 ? (
          <p className="text-ink-muted text-sm">Zgjidhni shtetin për të parë numrat përkatës.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {types.map((type) => (
              <Field
                key={`${country}-${type}`}
                id={`identifiers-${type}`}
                label={IDENTIFIER_LABELS[type as keyof typeof IDENTIFIER_LABELS]}
                error={errors[`identifiers.${type}`]}
              >
                <Input
                  name={`identifiers.${type}`}
                  defaultValue={identifier(type)}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 font-mono"
                />
              </Field>
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="address" label="Adresa" error={errors.address}>
          <Input name="address" defaultValue={text("address")} maxLength={300} className="h-12" />
        </Field>
        <Field id="city" label="Qyteti" error={errors.city}>
          <Input name="city" defaultValue={text("city")} maxLength={100} className="h-12" />
        </Field>
        <Field
          id="invoiceReferenceNote"
          label="Referenca e faturave të furnitorit"
          error={errors.invoiceReferenceNote}
          hint="Si i numëron furnitori faturat e veta (p.sh. seria ose formati). Ndihmon në lidhjen e faturave të blerjes."
          className="md:col-span-2"
        >
          <Input
            name="invoiceReferenceNote"
            defaultValue={text("invoiceReferenceNote")}
            maxLength={300}
            className="h-12"
          />
        </Field>
      </div>

      <label className="flex min-h-12 items-center gap-3 text-base">
        <input
          type="checkbox"
          name="active"
          defaultChecked={active}
          className="accent-brand size-6 shrink-0"
        />
        Furnitor aktiv
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Anulo
        </Link>
        <SubmitButton>{mode === "create" ? "Ruaj furnitorin" : "Ruaj ndryshimet"}</SubmitButton>
      </div>
    </form>
  );
}
