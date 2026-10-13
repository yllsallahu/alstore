import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { OWNER_URL, TEST_DB, urlFor } from "./config";

const quiet = { max: 1, onnotice: () => {} } as const;

/** Recreates the test database from the migrations, then lets the runtime roles log in (local only). */
export default async function setup() {
  const admin = postgres(urlFor("postgres", "postgres"), quiet);
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }

  const owner = postgres(OWNER_URL, quiet);
  try {
    await migrate(drizzle(owner), { migrationsFolder: "drizzle" });
    await owner.unsafe("ALTER ROLE alstore_app LOGIN; ALTER ROLE alstore_readonly LOGIN");
  } finally {
    await owner.end();
  }

  return async () => {
    const cleanup = postgres(urlFor("postgres", "postgres"), quiet);
    try {
      await cleanup.unsafe("ALTER ROLE alstore_app NOLOGIN; ALTER ROLE alstore_readonly NOLOGIN");
    } finally {
      await cleanup.end();
    }
  };
}
