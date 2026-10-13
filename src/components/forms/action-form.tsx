"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";

import { Field } from "@/components/forms/field";
import { FormMessages } from "@/components/forms/form-messages";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

const StateContext = createContext<FormState>(initialFormState);

/**
 * A small form wrapper for server pages: it keeps the action state, shows the Albanian error
 * summary and lets <FormField> read its own error and the value to restore after a failure.
 */
export function ActionForm({
  action,
  idempotencyKey,
  hidden,
  children,
  className,
  submitLabel,
  pendingLabel = "Duke ruajtur…",
  variant = "primary",
  confirmNote,
}: {
  action: Action;
  idempotencyKey: string;
  hidden?: Record<string, string>;
  children?: ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  confirmNote?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <StateContext.Provider value={state}>
      <form
        key={state.attempt}
        action={formAction}
        noValidate
        className={cn("flex flex-col gap-4", className)}
      >
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        {Object.entries(hidden ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <FormMessages state={state} />
        {children}
        {confirmNote}
        <div className="flex justify-end">
          <SubmitButton variant={variant} pendingLabel={pendingLabel}>
            {submitLabel}
          </SubmitButton>
        </div>
      </form>
    </StateContext.Provider>
  );
}

interface FormFieldProps {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  kind?: "text" | "select" | "textarea" | "file" | "checkbox" | "date";
  defaultValue?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  accept?: string;
  className?: string;
  mono?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
}

export function FormField({
  name,
  label,
  hint,
  required,
  kind = "text",
  defaultValue = "",
  options = [],
  placeholder,
  accept,
  className,
  mono,
  inputMode,
}: FormFieldProps) {
  const state = useContext(StateContext);
  const error = state.fieldErrors?.[name];
  const restored = state.values?.[name];
  const value = restored ?? defaultValue;
  const id = `f-${name}`;

  if (kind === "checkbox") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="flex items-start gap-3 text-sm font-medium">
          <input
            id={id}
            type="checkbox"
            name={name}
            defaultChecked={restored ? restored === "on" : defaultValue === "on"}
            aria-invalid={error ? true : undefined}
            className="mt-0.5 size-5 shrink-0"
          />
          <span>{label}</span>
        </label>
        {hint && <p className="text-ink-muted pl-8 text-sm">{hint}</p>}
        {error && <p className="text-danger pl-8 text-sm font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {kind === "select" ? (
        <Select name={name} defaultValue={value}>
          <option value="">Zgjidhni…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : kind === "textarea" ? (
        <Textarea name={name} defaultValue={value} maxLength={1000} />
      ) : kind === "file" ? (
        <Input
          name={name}
          type="file"
          accept={accept}
          className="file:bg-brand-soft h-auto py-2.5 file:mr-3 file:rounded file:border-0 file:px-3 file:py-1.5 file:font-medium"
        />
      ) : (
        <Input
          name={name}
          type={kind === "date" ? "date" : "text"}
          defaultValue={value}
          placeholder={placeholder}
          autoComplete="off"
          inputMode={inputMode}
          spellCheck={false}
          className={cn("h-12", mono && "font-mono uppercase")}
        />
      )}
    </Field>
  );
}
