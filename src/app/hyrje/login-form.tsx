"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError && (
        <p
          role="alert"
          className="border-danger/30 bg-danger-soft text-danger rounded-md border px-4 py-3 text-sm"
        >
          {state.formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email-i</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          defaultValue={state.email}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-gabim" : undefined}
          required
        />
        {emailError && (
          <p id="email-gabim" className="text-danger text-sm">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Fjalëkalimi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-gabim" : undefined}
          required
        />
        {passwordError && (
          <p id="password-gabim" className="text-danger text-sm">
            {passwordError}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
        {pending ? "Duke kontrolluar…" : "Hyr"}
      </Button>
    </form>
  );
}
