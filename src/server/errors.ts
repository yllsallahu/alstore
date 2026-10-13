/** Business-rule failure: rolled back, never retried, shown to the user in Albanian. */
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 422) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

export const notFound = () =>
  new DomainError("NOT_FOUND", "Regjistri nuk u gjet ose nuk keni qasje në të.", 404);

/** Invalid input: field path → Albanian message (first issue per field). */
export class ValidationError extends DomainError {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>, message = "Kontrolloni fushat e shënuara.") {
    super("VALIDATION", message, 422);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export interface DuplicateMatch {
  id: string;
  label: string;
  reason: string;
}

/**
 * Possible duplicate found: nothing was saved. The user may resubmit with the listed ids
 * acknowledged; a new match appearing meanwhile triggers the warning again.
 */
export class DuplicateWarning extends DomainError {
  readonly matches: DuplicateMatch[];

  constructor(matches: DuplicateMatch[]) {
    super(
      "DUPLICATE_WARNING",
      "Ekziston një regjistër i ngjashëm. Kontrolloni para se ta ruani.",
      409,
    );
    this.name = "DuplicateWarning";
    this.matches = matches;
  }
}

export const staleVersion = () =>
  new DomainError(
    "STALE_VERSION",
    "Të dhënat janë ndryshuar ndërkohë nga një përdorues tjetër ose në një skedë tjetër. Rifreskoni faqen dhe provoni përsëri.",
    409,
  );
