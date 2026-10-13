import { getServerEnv } from "@/lib/env";

import { createDb, type Db } from "./client";

let handle: { db: Db } | undefined;

/** The running app's single connection pool (server-only). `null` when not configured. */
export function getAppDb(): Db | null {
  const url = getServerEnv().DATABASE_URL;
  if (!url) return null;
  handle ??= createDb(url, { max: 5 });
  return handle.db;
}
