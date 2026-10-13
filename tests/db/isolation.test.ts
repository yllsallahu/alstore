import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadActor } from "@/server/auth/actor";
import { DomainError } from "@/server/errors";
import { setUserStatus } from "@/server/services/users";

import {
  appHandle,
  asOrg,
  expectSqlState,
  insertCustomer,
  insertProduct,
  ownerSql,
  seedOrg,
  type SeededOrg,
} from "./helpers";

const { db, close } = appHandle();
let a: SeededOrg;
let b: SeededOrg;
let customerA: string;

beforeAll(async () => {
  a = await seedOrg(db);
  b = await seedOrg(db);
  customerA = await asOrg(db, a.orgId, (tx) => insertCustomer(tx, a.orgId));
});
afterAll(() => close());

describe("organization isolation (RLS)", () => {
  it("shows only the current organization's rows", async () => {
    const rows = await asOrg(db, b.orgId, (tx) =>
      tx.execute<{ org_id: string }>(sql`select org_id from app.users`),
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.org_id === b.orgId)).toBe(true);
    const orgs = await asOrg(db, b.orgId, (tx) =>
      tx.execute(sql`select id from app.organizations`),
    );
    expect(orgs).toHaveLength(1);
  });

  it("shows nothing when no organization context is set", async () => {
    const rows = await db.transaction((tx) => tx.execute(sql`select id from app.users`));
    expect(rows).toHaveLength(0);
  });

  it("rejects writing a row for another organization", async () => {
    await expectSqlState(
      asOrg(db, b.orgId, (tx) =>
        tx.execute(sql`insert into app.customers (org_id, legal_name) values (${a.orgId}, 'X')`),
      ),
      "42501",
    );
  });

  it("cannot read, update or move another organization's row", async () => {
    const result = await asOrg(db, b.orgId, async (tx) => {
      const seen = await tx.execute(sql`select id from app.customers where id = ${customerA}`);
      const updated = await tx.execute(
        sql`update app.customers set legal_name = 'Hijacked' where id = ${customerA} returning id`,
      );
      return { seen: seen.length, updated: updated.length };
    });
    expect(result).toEqual({ seen: 0, updated: 0 });
    await expectSqlState(
      asOrg(db, a.orgId, (tx) =>
        tx.execute(sql`update app.customers set org_id = ${b.orgId} where id = ${customerA}`),
      ),
      "42501",
    );
  });

  it("rejects a stock movement pointing at another organization's event", async () => {
    const eventId = await asOrg(db, a.orgId, async (tx) => {
      const [event] = await tx.execute<{ id: string }>(sql`
        insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
        values (${a.orgId}, 'ADJUSTMENT', 'INVENTORY_ADJUSTMENT', ${randomUUID()}, '2026-10-13', ${a.director.userId})
        returning id`);
      return event!.id;
    });
    await expectSqlState(
      asOrg(db, b.orgId, async (tx) => {
        const productB = await insertProduct(tx, b.orgId);
        await tx.execute(sql`
          insert into app.stock_movements (org_id, stock_event_id, product_id, quantity_delta, unit,
            source_type, movement_type, source_line_id)
          values (${b.orgId}, ${eventId}, ${productB}, 1, 'KG', 'INVENTORY_ADJUSTMENT', 'ADJUSTMENT', ${randomUUID()})`);
      }),
      "23514",
    );
  });

  it("rejects a foreign key that points into another organization", async () => {
    const saleInB = (tx: Parameters<Parameters<typeof asOrg>[2]>[0]) =>
      tx.execute(sql`
        insert into app.sales (org_id, customer_id, payment_term_days, created_by)
        values (${b.orgId}, ${customerA}, 15, ${b.director.userId})`);
    await expectSqlState(asOrg(db, b.orgId, saleInB), "42501");

    const owner = ownerSql();
    try {
      await expectSqlState(
        owner`insert into app.sales (org_id, customer_id, payment_term_days, created_by)
          values (${b.orgId}, ${customerA}, 15, ${b.director.userId})`,
        "42501",
      );
      const [row] = await owner<{ n: number }[]>`
        select count(*)::int as n from pg_trigger where tgname like '%\_same\_org' and not tgisinternal`;
      expect(row!.n).toBeGreaterThan(40);
    } finally {
      await owner.end();
    }
  });

  it("denies a director acting on another organization's user through the service", async () => {
    const error = await setUserStatus(
      db,
      b.director,
      { userId: a.accountant.userId, status: "DISABLED" },
      randomUUID(),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe("NOT_FOUND");
    const stillActive = await loadActor(db, a.accountant.userId, { mfaVerified: true });
    expect(stillActive.orgId).toBe(a.orgId);
  });

  it("resolves each user to their own organization and role", async () => {
    const actor = await loadActor(db, b.accountant.userId, { mfaVerified: false });
    expect(actor).toEqual({
      userId: b.accountant.userId,
      orgId: b.orgId,
      role: "ACCOUNTANT",
      mfaVerified: false,
    });
  });
});
