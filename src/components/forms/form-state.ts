import type { DuplicateMatch } from "@/server/errors";

/** Result of a master-data server action, rendered by the client form. */
export interface FormState {
  /** Incremented on every response so the form remounts with the returned values. */
  attempt: number;
  formError?: string;
  fieldErrors?: Record<string, string>;
  duplicates?: DuplicateMatch[];
  values?: Record<string, string>;
  success?: string;
}

export const initialFormState: FormState = { attempt: 0 };
