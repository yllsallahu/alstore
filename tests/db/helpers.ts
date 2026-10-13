import { randomUUID } from "node:crypto";

import { sql, type SQL } from "drizzle-orm";
import postgres from "postgres";
import { expect } from "vitest";

import { loadActor } from "@/server/auth/actor";
import type { Actor } from "@/server/auth/permissions";
import { createDb, runInTransaction, sqlState, type Db, type Tx } from "@/server/db/client";
import { bootstrapOrganization } from "@/server/services/organization";
import { inviteUser, setUserStatus } from "@/server/services/users";

import { APP_URL, OWNER_URL } from "./config";

export const appHandle = () => createDb(APP_URL, { max: 5 });
export const ownerSql = () => postgres(OWNER_URL, { max: 2, onnotice: () => {} });

export interface SeededOrg {
  orgId: string;
  director: Actor;
  accountant: Actor;
}

let counter = 0;

/** Synthetic organization with an ACTIVE director and accountant, created through the services. */
export async function seedOrg(db: Db): Promise<SeededOrg> {
  counter += 1;
  const directorId = randomUUID();
  const accountantId = randomUUID();
  const { orgId } = await bootstrapOrganization(db, {
    legalName: `Test Org ${counter}`,
    director: { userId: directorId, displayName: `Drejtor ${counter}` },
  });
  const director = await loadActor(db, directorId, { mfaVerified: true });
  await inviteUser(
    db,
    director,
    { userId: accountantId, displayName: `Kontabilist ${counter}`, role: "ACCOUNTANT" },
    randomUUID(),
  );
  await setUserStatus(db, director, { userId: accountantId, status: "ACTIVE" }, randomUUID());
  const accountant = await loadActor(db, accountantId, { mfaVerified: true });
  return { orgId, director, accountant };
}

/** Runs raw SQL as the app role inside an org-scoped transaction. */
export function asOrg<T>(db: Db, orgId: string, fn: (tx: Tx) => Promise<T>, actorId?: string) {
  return runInTransaction(db, { orgId, actorId: actorId ?? null }, fn);
}

export const exec = (tx: Tx, query: SQL) => tx.execute(query);

export async function expectSqlState(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error, `expected SQLSTATE ${code}`).toBeDefined();
  expect(sqlState(error)).toBe(code);
}

export async function insertProduct(
  tx: Tx,
  orgId: string,
  sku = `SKU-${randomUUID().slice(0, 8).toUpperCase()}`,
) {
  const [row] = await tx.execute<{ id: string }>(sql`
    insert into app.products (org_id, sku, name, category, unit)
    values (${orgId}, ${sku}, 'Profil test', 'ALUMINIUM', 'KG') returning id`);
  return row!.id;
}

export async function insertCustomer(tx: Tx, orgId: string) {
  const [row] = await tx.execute<{ id: string }>(sql`
    insert into app.customers (org_id, legal_name) values (${orgId}, 'Klient Test SH.P.K.')
    returning id`);
  return row!.id;
}
