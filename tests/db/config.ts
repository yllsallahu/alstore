const host = process.env.ALSTORE_PG_HOST ?? "127.0.0.1";
const port = process.env.ALSTORE_PG_PORT ?? "54329";

if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  throw new Error("DB tests run only against the local PostgreSQL cluster (scripts/db-local.sh).");
}

export const TEST_DB = "alstore_test";
export const urlFor = (user: string, database = TEST_DB) =>
  `postgres://${user}@${host}:${port}/${database}`;

/** Superuser on the local trust-auth cluster: migrations, fixtures and catalog checks only. */
export const OWNER_URL = urlFor("postgres");
/** The runtime role the application uses; RLS and grants apply. */
export const APP_URL = urlFor("alstore_app");
export const READONLY_URL = urlFor("alstore_readonly");
