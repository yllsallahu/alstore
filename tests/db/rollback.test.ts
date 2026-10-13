import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlFor } from "./config";

const SCRATCH = "alstore_rollback_scratch";
const quiet = { max: 1, onnotice: () => {} } as const;
const admin = postgres(urlFor("postgres", "postgres"), quiet);

beforeAll(async () => {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${SCRATCH}`);
});
afterAll(async () => {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  await admin.end();
});

async function tableCount(client: postgres.Sql) {
  const [row] = await client<{ n: number }[]>`
    select count(*)::int as n from pg_tables where schemaname = 'app'`;
  return row!.n;
}

describe("rollback method (docs/PHASE_02.md)", () => {
  it("migrates up, rolls back to empty, and migrates up again", async () => {
    const client = postgres(urlFor("postgres", SCRATCH), quiet);
    try {
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect(await tableCount(client)).toBe(60);

      const down = await readFile("drizzle/rollback/0000_0001_down.sql", "utf8");
      await client.unsafe(down);
      expect(await tableCount(client)).toBe(0);
      const [schema] =
        await client`select count(*)::int as n from pg_namespace where nspname = 'app'`;
      expect(schema?.n).toBe(0);

      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect(await tableCount(client)).toBe(60);
    } finally {
      await client.end();
    }
  });

  it("rolls 0002/0003 back to the Phase 02 schema and re-applies them", async () => {
    const client = postgres(urlFor("postgres", SCRATCH), quiet);
    try {
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect(await tableCount(client)).toBe(60);

      const down = await readFile("drizzle/rollback/0002_0003_down.sql", "utf8");
      await client.unsafe(down);
      expect(await tableCount(client)).toBe(58);
      const [column] = await client<{ n: number }[]>`
        select count(*)::int as n from information_schema.columns
        where table_schema = 'app' and table_name = 'customer_verifications'
          and column_name = 'identity_hash'`;
      expect(column?.n).toBe(0);
      const [guard] = await client<{ src: string }[]>`
        select prosrc as src from pg_proc where proname = 'products_guard'`;
      expect(guard?.src).not.toContain("unit_change_id");

      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect(await tableCount(client)).toBe(60);
      const [again] = await client<{ src: string }[]>`
        select prosrc as src from pg_proc where proname = 'products_guard'`;
      expect(again?.src).toContain("unit_change_id");
    } finally {
      await client.end();
    }
  });
});
