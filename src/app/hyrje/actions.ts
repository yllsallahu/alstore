"use server";

import { validateLogin, type LoginFieldErrors } from "@/lib/validation/login";

export type LoginState = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  email?: string;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const result = validateLogin({ email, password: formData.get("password") });
  const echoedEmail = typeof email === "string" ? email : "";

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors, email: echoedEmail };
  }

  return {
    email: echoedEmail,
    formError:
      "Hyrja nuk është aktivizuar ende. Llogaritë personale të drejtorit dhe të kontabilistit krijohen në fazën e ardhshme.",
  };
}
