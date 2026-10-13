"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/env";
import { PREVIEW_ROLE_COOKIE } from "@/server/auth/session";

/** Development preview only: switch which synthetic local user acts (DIRECTOR / ACCOUNTANT). */
export async function switchPreviewRole(form: FormData) {
  const env = getServerEnv();
  if (env.APP_ENV !== "development" || !env.UI_PREVIEW) redirect("/hyrje");
  const role = form.get("role") === "ACCOUNTANT" ? "ACCOUNTANT" : "DIRECTOR";
  const store = await cookies();
  store.set(PREVIEW_ROLE_COOKIE, role, { httpOnly: true, sameSite: "strict", path: "/" });
  const back = form.get("back");
  redirect(typeof back === "string" && back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
