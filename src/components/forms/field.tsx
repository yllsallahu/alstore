import type { ReactElement, ReactNode } from "react";
import { cloneElement } from "react";

import { cn } from "@/lib/utils";

/**
 * Label + control + hint + Albanian error, wired with aria-describedby / aria-invalid.
 * The control must accept id/aria props (Input, Select, Textarea).
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const hintId = hint ? `${id}-ndihme` : undefined;
  const errorId = error ? `${id}-gabim` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-ink text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
        {required && <span className="sr-only"> (e detyrueshme)</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}
      {error && (
        <p id={errorId} className="text-danger text-sm font-medium">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-ink-muted text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}
