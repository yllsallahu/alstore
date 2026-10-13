import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Tx } from "@/server/db/client";

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
const owner = ownerSql();
let org: SeededOrg;

beforeAll(async () => {
  org = await seedOrg(db);
});
afterAll(async () => {
  await close();
  await owner.end();
});

const run = <T>(fn: (tx: Tx) => Promise<T>) => asOrg(db, org.orgId, fn, org.director.userId);

async function adjustmentEvent(tx: Tx) {
  const [event] = await tx.execute<{ id: string }>(sql`
    insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
    values (${org.orgId}, 'ADJUSTMENT', 'INVENTORY_ADJUSTMENT', ${randomUUID()}, '2026-10-13', ${org.director.userId})
    returning id`);
  return event!.id;
}

async function movement(tx: Tx, eventId: string, productId: string, delta: string, unit = "KG") {
  await tx.execute(sql`
    insert into app.stock_movements (org_id, stock_event_id, product_id, quantity_delta, unit,
      source_type, movement_type, source_line_id)
    values (${org.orgId}, ${eventId}, ${productId}, ${delta}, ${unit}, 'INVENTORY_ADJUSTMENT', 'ADJUSTMENT', ${randomUUID()})`);
}

describe("append-only tables", () => {
  it("denies UPDATE and DELETE of audit events to the app role", async () => {
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.audit_events set action = 'x'`)),
      "42501",
    );
    await expectSqlState(
      run((tx) => tx.execute(sql`delete from app.audit_events`)),
      "42501",
    );
  });

  it("blocks UPDATE and DELETE by the trigger even for a privileged role", async () => {
    await expectSqlState(owner`update app.audit_events set action = 'x'`, "55000");
    await expectSqlState(owner`delete from app.audit_events`, "55000");
  });

  it("allows locking a settlement target but never changing it", async () => {
    const targetId = randomUUID();
    await run(async (tx) => {
      await tx.execute(sql`insert into app.settlement_targets (target_type, target_id, org_id)
        values ('TAX_INVOICE', ${targetId}, ${org.orgId})`);
      const locked = await tx.execute(
        sql`select 1 from app.settlement_targets where target_id = ${targetId} for update`,
      );
      expect(locked).toHaveLength(1);
    });
    await expectSqlState(
      run((tx) =>
        tx.execute(
          sql`update app.settlement_targets set created_at = now() where target_id = ${targetId}`,
        ),
      ),
      "55000",
    );
  });
});

describe("inventory backstops", () => {
  it("creates one zero balance with each product and keeps it non-negative", async () => {
    const productId = await run((tx) => insertProduct(tx, org.orgId));
    const [balance] = await run((tx) =>
      tx.execute<{ on_hand: string }>(
        sql`select on_hand from app.stock_balances where product_id = ${productId}`,
      ),
    );
    expect(balance?.on_hand).toBe("0.000");
    await expectSqlState(
      run((tx) =>
        tx.execute(
          sql`update app.stock_balances set on_hand = -0.001 where product_id = ${productId}`,
        ),
      ),
      "23514",
    );
  });

  it("keeps SKU immutable and unit immutable after the first movement", async () => {
    const productId = await run((tx) => insertProduct(tx, org.orgId));
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.products set sku = 'CHANGED' where id = ${productId}`)),
      "55000",
    );
    await run((tx) => tx.execute(sql`update app.products set unit = 'M2' where id = ${productId}`));
    await run(async (tx) => movement(tx, await adjustmentEvent(tx), productId, "1.000", "M2"));
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.products set unit = 'KG' where id = ${productId}`)),
      "55000",
    );
  });

  it("rejects movements that disagree with their event or product", async () => {
    const productId = await run((tx) => insertProduct(tx, org.orgId));
    await expectSqlState(
      run(async (tx) => movement(tx, await adjustmentEvent(tx), productId, "1.000", "COPE")),
      "23514",
    );
    await expectSqlState(
      run((tx) =>
        tx.execute(sql`
          insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
          values (${org.orgId}, 'SALE_FULFILLMENT', 'INVENTORY_ADJUSTMENT', ${randomUUID()}, '2026-10-13', ${org.director.userId})`),
      ),
      "23514",
    );
    await expectSqlState(
      run(async (tx) => movement(tx, await adjustmentEvent(tx), productId, "0")),
      "23514",
    );
  });
});

describe("status-frozen documents", () => {
  it("freezes a confirmed sale and its lines; draft lines stay editable", async () => {
    const { saleId, productId } = await run(async (tx) => {
      const customerId = await insertCustomer(tx, org.orgId);
      const product = await insertProduct(tx, org.orgId);
      const [sale] = await tx.execute<{ id: string }>(sql`
        insert into app.sales (org_id, customer_id, payment_term_days, created_by)
        values (${org.orgId}, ${customerId}, 15, ${org.director.userId}) returning id`);
      await tx.execute(sql`
        insert into app.sale_lines (org_id, sale_id, line_no, product_id, quantity, unit, unit_price_net)
        values (${org.orgId}, ${sale!.id}, 1, ${product}, 2.500, 'KG', 4.125)`);
      await tx.execute(sql`delete from app.sale_lines where sale_id = ${sale!.id}`);
      await tx.execute(sql`
        insert into app.sale_lines (org_id, sale_id, line_no, product_id, quantity, unit, unit_price_net)
        values (${org.orgId}, ${sale!.id}, 1, ${product}, 2.500, 'KG', 4.125)`);
      await tx.execute(
        sql`update app.sales set status = 'CONFIRMED', confirmed_at = now() where id = ${sale!.id}`,
      );
      return { saleId: sale!.id, productId: product };
    });

    await expectSqlState(
      run((tx) =>
        tx.execute(sql`update app.sales set payment_term_days = 30 where id = ${saleId}`),
      ),
      "55000",
    );
    await expectSqlState(
      run((tx) =>
        tx.execute(sql`update app.sale_lines set quantity = 1 where sale_id = ${saleId}`),
      ),
      "55000",
    );
    await expectSqlState(
      run((tx) => tx.execute(sql`delete from app.sale_lines where sale_id = ${saleId}`)),
      "55000",
    );
    await expectSqlState(
      run((tx) =>
        tx.execute(sql`
          insert into app.sale_lines (org_id, sale_id, line_no, product_id, quantity, unit, unit_price_net)
          values (${org.orgId}, ${saleId}, 2, ${productId}, 1, 'KG', 1)`),
      ),
      "55000",
    );
  });

  it("prevents overlapping active VAT rules and freezes active ones except closing them", async () => {
    const ruleId = await run(async (tx) => {
      const [set] = await tx.execute<{ id: string }>(sql`
        insert into app.vat_rule_sets (org_id, name, created_by)
        values (${org.orgId}, 'Test set', ${org.accountant.userId}) returning id`);
      const [rule] = await tx.execute<{ id: string }>(sql`
        insert into app.vat_rules (org_id, rule_set_id, category_code, applies_to, rate, treatment,
          effective_from, status)
        values (${org.orgId}, ${set!.id}, 'TEST-CAT', 'SALE', 0, 'TEST', '2026-01-01', 'ACTIVE')
        returning id`);
      return rule!.id;
    });
    const insertRule = (from: string, status: string) =>
      run((tx) =>
        tx.execute(sql`
          insert into app.vat_rules (org_id, rule_set_id, category_code, applies_to, rate, treatment,
            effective_from, status)
          select org_id, rule_set_id, category_code, applies_to, rate, treatment, ${from}, ${status}
          from app.vat_rules where id = ${ruleId}`),
      );

    await expectSqlState(insertRule("2026-06-01", "ACCOUNTANT_APPROVED"), "23P01");
    await insertRule("2026-06-01", "DRAFT");
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.vat_rules set rate = 1 where id = ${ruleId}`)),
      "55000",
    );
    await run((tx) =>
      tx.execute(sql`update app.vat_rules set effective_to = '2026-06-01' where id = ${ruleId}`),
    );
    await insertRule("2026-06-01", "ACCOUNTANT_APPROVED");
  });
});

describe("approvals", () => {
  const insertApproval = (fields: {
    actorId: string;
    actorRole: string;
    requesterId?: string;
    fourEyes?: boolean;
  }) =>
    run(async (tx) => {
      const [row] = await tx.execute<{ id: string }>(sql`
        insert into app.approvals (org_id, subject_type, subject_id, approval_kind, actor_id,
          actor_role, requester_id, requires_four_eyes, decision)
        values (${org.orgId}, 'TEST', ${randomUUID()}, 'TEST', ${fields.actorId}, ${fields.actorRole},
          ${fields.requesterId ?? null}, ${fields.fourEyes ?? false}, 'APPROVED')
        returning id`);
      return row!.id;
    });

  it("rejects a four-eyes approval by the requester", async () => {
    const id = org.director.userId;
    await expectSqlState(
      insertApproval({ actorId: id, actorRole: "DIRECTOR", requesterId: id, fourEyes: true }),
      "23514",
    );
    await insertApproval({
      actorId: org.accountant.userId,
      actorRole: "ACCOUNTANT",
      requesterId: id,
      fourEyes: true,
    });
  });

  it("rejects an approval whose role does not match the actor's current role", async () => {
    await expectSqlState(
      insertApproval({ actorId: org.accountant.userId, actorRole: "DIRECTOR" }),
      "23514",
    );
  });

  it("only allows APPROVED → INVALIDATED and never deletion", async () => {
    const id = await insertApproval({ actorId: org.director.userId, actorRole: "DIRECTOR" });
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.approvals set comment = 'edited' where id = ${id}`)),
      "55000",
    );
    await run((tx) =>
      tx.execute(sql`update app.approvals set decision = 'INVALIDATED' where id = ${id}`),
    );
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.approvals set decision = 'APPROVED' where id = ${id}`)),
      "55000",
    );
    await expectSqlState(
      run((tx) => tx.execute(sql`delete from app.approvals where id = ${id}`)),
      "42501",
    );
    await expectSqlState(owner`delete from app.approvals where id = ${id}`, "55000");
  });
});
