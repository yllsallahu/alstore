import type { ServerEnv } from "@/lib/env";

export type ShellAccess = { allowed: true; mode: "preview" } | { allowed: false };

/**
 * Personal accounts and sessions arrive in Phase 02. Until then nobody can sign in, and the
 * app shell is reachable only in the local development UI preview (rejected by env validation
 * for staging and production).
 */
export function getShellAccess(env: Pick<ServerEnv, "APP_ENV" | "UI_PREVIEW">): ShellAccess {
  if (env.APP_ENV === "development" && env.UI_PREVIEW) {
    return { allowed: true, mode: "preview" };
  }
  return { allowed: false };
}
