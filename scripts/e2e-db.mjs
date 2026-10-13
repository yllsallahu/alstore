#!/usr/bin/env node
// AL STORE — recreate the local E2E database with migrations and SYNTHETIC preview users.
// Local cluster only (scripts/db-local.sh). Never point this at Supabase or any shared server.
// Usage: node scripts/e2e-db.mjs

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const host = process.env.ALSTORE_PG_HOST ?? "127.0.0.1";
const port = process.env.ALSTORE_PG_PORT ?? "54329";
if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
  console.error("e2e-db: refusing a non-local database host");
  process.exit(1);
}
const DB = "alstore_e2e";
const url = (database) => `postgres://postgres@${host}:${port}/${database}`;
const quiet = { max: 1, onnotice: () => {} };

/** Fixed synthetic ids, also used by playwright.config.ts (DEV_PREVIEW_*). */
export const E2E = {
  orgId: "00000000-0000-4000-8000-00000000e2e0",
  directorId: "00000000-0000-4000-8000-00000000d001",
  accountantId: "00000000-0000-4000-8000-00000000a001",
  lockedProductId: "00000000-0000-4000-8000-0000000000b1",
};

const admin = postgres(url("postgres"), quiet);
try {
  await admin.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${DB}`);
} finally {
  await admin.end();
}

const owner = postgres(url(DB), quiet);
try {
  await migrate(drizzle(owner), { migrationsFolder: "drizzle" });
  await owner.unsafe("ALTER ROLE alstore_app LOGIN");
  await owner.begin(async (tx) => {
    await tx`insert into app.organizations (id, legal_name) values (${E2E.orgId}, 'Organizatë Sintetike E2E')`;
    await tx`insert into app.org_settings (org_id) values (${E2E.orgId})`;
    await tx`insert into app.users (id, org_id, display_name, status) values
      (${E2E.directorId}, ${E2E.orgId}, 'Drejtor Sintetik', 'ACTIVE'),
      (${E2E.accountantId}, ${E2E.orgId}, 'Kontabiliste Sintetike', 'ACTIVE')`;
    await tx`insert into app.user_roles (user_id, org_id, role) values
      (${E2E.directorId}, ${E2E.orgId}, 'DIRECTOR'),
      (${E2E.accountantId}, ${E2E.orgId}, 'ACCOUNTANT')`;
    await tx`insert into app.audit_events (org_id, action, entity_type, entity_id, safe_details)
      values (${E2E.orgId}, 'organization.bootstrap', 'organization', ${E2E.orgId}, '{"source":"e2e-db"}')`;
    // A product that already has (balanced) stock movements: its unit is locked (INV-05).
    await tx`insert into app.products (id, org_id, sku, name, category, unit)
      values (${E2E.lockedProductId}, ${E2E.orgId}, 'E2E-LOCK', 'Profil sintetik me lëvizje', 'ALUMINIUM', 'KG')`;
    for (const delta of ["2.500", "-2.500"]) {
      const [event] = await tx`
        insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
        values (${E2E.orgId}, 'ADJUSTMENT', 'INVENTORY_ADJUSTMENT', gen_random_uuid(), '2026-10-13', ${E2E.directorId})
        returning id`;
      await tx`
        insert into app.stock_movements (org_id, stock_event_id, product_id, quantity_delta, unit,
          source_type, movement_type, source_line_id)
        values (${E2E.orgId}, ${event.id}, ${E2E.lockedProductId}, ${delta}, 'KG',
          'INVENTORY_ADJUSTMENT', 'ADJUSTMENT', gen_random_uuid())`;
    }
  });
  console.log(`e2e-db: ${DB} migrated and seeded with synthetic preview users`);
} finally {
  await owner.end();
}
