"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field } from "@/components/forms/field";
import { AcknowledgedDuplicates, FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/master-data-labels";

export interface ProductFormDefaults {
  sku: string;
  name: string;
  category: string;
  unit: string;
  barcode: string;
  referencePurchasePrice: string;
  active: boolean;
}

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

export function ProductForm({
  mode,
  action,
  idempotencyKey,
  defaults,
  productId,
  version,
  unitLocked = false,
  cancelHref,
}: {
  mode: "create" | "edit";
  action: Action;
  idempotencyKey: string;
  defaults: ProductFormDefaults;
  productId?: string;
  version?: number;
  unitLocked?: boolean;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const v = state.values;
  const value = (name: keyof ProductFormDefaults) =>
    v ? (v[name] ?? "") : String(defaults[name] ?? "");
  const errors = state.fieldErrors ?? {};
  const active = v ? v.active === "on" : defaults.active;

  return (
    <form key={state.attempt} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {productId && <input type="hidden" name="productId" value={productId} />}
      {version !== undefined && <input type="hidden" name="expectedVersion" value={version} />}
      <AcknowledgedDuplicates state={state} />
      <FormMessages state={state} />

      <div className="grid gap-5 md:grid-cols-2">
        {mode === "create" ? (
          <Field
            id="sku"
            label="SKU"
            required
            error={errors.sku}
            hint="Kodi unik i produktit. Nuk mund të ndryshohet pas ruajtjes. Shkronjat kthehen në të mëdha."
          >
            <Input
              name="sku"
              defaultValue={value("sku")}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              className="h-12 font-mono uppercase"
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">SKU</span>
            <p className="border-line bg-canvas flex h-12 items-center rounded-md border px-3 font-mono">
              {defaults.sku}
            </p>
            <p className="text-ink-muted text-sm">SKU nuk ndryshon pas krijimit.</p>
          </div>
        )}

        <Field id="name" label="Emri i produktit" required error={errors.name}>
          <Input name="name" defaultValue={value("name")} maxLength={200} className="h-12" />
        </Field>

        <Field id="category" label="Kategoria" required error={errors.category}>
          <Select name="category" defaultValue={value("category")}>
            <option value="" disabled>
              Zgjidhni…
            </option>
            {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="unit"
          label="Njësia kanonike"
          required
          error={errors.unit}
          hint={
            unitLocked
              ? "E kyçur: produkti ka lëvizje stoku. Ndryshimi kërkon migrim të miratuar më poshtë."
              : "Stoku mbahet vetëm në këtë njësi. Nuk ka konvertim mes njësive."
          }
        >
          <Select name="unit" defaultValue={value("unit")} disabled={unitLocked}>
            <option value="" disabled>
              Zgjidhni…
            </option>
            {Object.entries(UNIT_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {unitLocked && <input type="hidden" name="unit" value={defaults.unit} />}

        <Field
          id="barcode"
          label="Barkodi (opsional)"
          error={errors.barcode}
          hint="4–64 shifra ose shkronja latine. Duhet të jetë unik."
        >
          <Input
            name="barcode"
            defaultValue={value("barcode")}
            inputMode="text"
            autoComplete="off"
            className="h-12 font-mono"
          />
        </Field>

        <Field
          id="referencePurchasePrice"
          label="Çmimi referues i blerjes, pa TVSH (EUR, opsional)"
          error={errors.referencePurchasePrice}
          hint="Vetëm informativ: nuk përdoret si bazë tatimore. Deri në 3 shifra pas presjes, p.sh. 4,125."
        >
          <Input
            name="referencePurchasePrice"
            defaultValue={value("referencePurchasePrice")}
            inputMode="decimal"
            autoComplete="off"
            className="h-12 text-right tabular-nums"
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
        Produkt aktiv (shfaqet në kërkime dhe mund të përdoret në dokumente)
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Anulo
        </Link>
        <SubmitButton>{mode === "create" ? "Ruaj produktin" : "Ruaj ndryshimet"}</SubmitButton>
      </div>
    </form>
  );
}
