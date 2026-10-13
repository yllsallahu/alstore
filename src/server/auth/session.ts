import { cookies } from "next/headers";

import { getServerEnv, isLocalDatabaseUrl } from "@/lib/env";
import { getAppDb } from "@/server/db/app-db";
import type { Db } from "@/server/db/client";

import { loadActor } from "./actor";
import { AuthorizationError, type Actor, type Role } from "./permissions";

export const PREVIEW_ROLE_COOKIE = "alstore_preview_role";

export type RequestContext =
  | { kind: "ready"; db: Db; actor: Actor; preview: boolean }
  | { kind: "unavailable"; reason: "AUTH_BLOCKED" | "DB_NOT_CONFIGURED" | "ACCOUNT_INACTIVE" };

/** Which synthetic preview user acts, chosen with a dev-only cookie (default DIRECTOR). */
async function previewRole(): Promise<Role> {
  const store = await cookies();
  return store.get(PREVIEW_ROLE_COOKIE)?.value === "ACCOUNTANT" ? "ACCOUNTANT" : "DIRECTOR";
}

/**
 * The verified actor of this request. Real sessions need Supabase Auth, which is BLOCKED
 * (RG-03), so outside the local development preview nobody is ever an actor. The preview acts
 * as a synthetic local user whose role and status still come from the database; MFA is treated
 * as satisfied only there, and env validation rejects this mode anywhere but development.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const env = getServerEnv();
  const previewAllowed =
    env.APP_ENV === "development" &&
    env.UI_PREVIEW &&
    !!env.DATABASE_URL &&
    isLocalDatabaseUrl(env.DATABASE_URL);
  if (!previewAllowed) return { kind: "unavailable", reason: "AUTH_BLOCKED" };

  const db = getAppDb();
  if (!db) return { kind: "unavailable", reason: "DB_NOT_CONFIGURED" };
  const role = await previewRole();
  const userId =
    role === "ACCOUNTANT" ? env.DEV_PREVIEW_ACCOUNTANT_ID : env.DEV_PREVIEW_DIRECTOR_ID;
  if (!userId) return { kind: "unavailable", reason: "DB_NOT_CONFIGURED" };
  try {
    const actor = await loadActor(db, userId, { mfaVerified: true });
    return { kind: "ready", db, actor, preview: true };
  } catch (error) {
    if (error instanceof AuthorizationError)
      return { kind: "unavailable", reason: "ACCOUNT_INACTIVE" };
    throw error;
  }
}

export const UNAVAILABLE_MESSAGES = {
  AUTH_BLOCKED:
    "Hyrja me llogari personale nuk është aktivizuar ende. Të dhënat nuk mund të shihen ose ndryshohen pa një përdorues të verifikuar.",
  DB_NOT_CONFIGURED: "Lidhja me bazën e të dhënave nuk është konfiguruar për këtë mjedis.",
  ACCOUNT_INACTIVE: "Llogaria juaj nuk është aktive.",
} as const;
