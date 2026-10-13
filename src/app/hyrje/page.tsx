import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { getServerEnv } from "@/lib/env";
import { getShellAccess } from "@/server/auth/shell-access";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Hyrja" };

export default async function LoginPage() {
  await connection();
  const preview = getShellAccess(getServerEnv()).allowed;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-center text-lg font-semibold tracking-tight">AL STORE</p>
        <div className="border-line bg-surface mt-6 rounded-lg border p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Hyrja</h1>
          <p className="text-ink-muted mt-1 mb-6 text-sm">
            Aplikacion privat për shitje me shumicë B2B. Hyrja bëhet vetëm me llogari personale të
            krijuar me ftesë.
          </p>
          <LoginForm />
        </div>
        <p className="text-ink-muted mt-4 text-center text-sm">
          Nuk ka regjistrim publik. Për qasje kontaktoni drejtorin.
        </p>
        {preview && (
          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-brand font-medium underline underline-offset-4">
              Hap pamjen paraprake për zhvillim
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
