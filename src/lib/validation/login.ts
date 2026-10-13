import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Shkruani email-in." })
    .trim()
    .min(1, { error: "Shkruani email-in." })
    .pipe(z.email({ error: "Email-i nuk është i vlefshëm." })),
  password: z
    .string({ error: "Shkruani fjalëkalimin." })
    .min(1, { error: "Shkruani fjalëkalimin." }),
});

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

export function validateLogin(input: {
  email: unknown;
  password: unknown;
}): { ok: true; email: string } | { ok: false; fieldErrors: LoginFieldErrors } {
  const result = loginSchema.safeParse(input);
  if (result.success) return { ok: true, email: result.data.email };
  const flat = z.flattenError(result.error).fieldErrors;
  return {
    ok: false,
    fieldErrors: { email: flat.email?.[0], password: flat.password?.[0] },
  };
}
