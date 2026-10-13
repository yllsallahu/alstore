import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthorizationError } from "@/server/auth/permissions";
import type { Tx } from "@/server/db/client";
import { DomainError, DuplicateWarning, ValidationError } from "@/server/errors";
import {
  createProduct,
  decideUnitChange,
  getProduct,
  requestUnitChange,
  searchProducts,
  updateProduct,
} from "@/server/services/master-data/products";
import { setUserStatus } from "@/server/services/users";

import { appHandle, asOrg, expectSqlState, ownerSql, seedOrg, type SeededOrg } from "./helpers";

const { db, close } = appHandle();
const owner = ownerSql();
let org: SeededOrg;
let other: SeededOrg;

beforeAll(async () => {
  org = await seedOrg(db);
  other = await seedOrg(db);
});
afterAll(async () => {
  await close();
  await owner.end();
});

const key = () => randomUUID();
const caught = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (e: unknown) => e,
  );
const sku = (prefix = "AL") => `${prefix}-${randomUUID().slice(0, 6).toUpperCase()}`;

const base = (overrides: Record<string, unknown> = {}) => ({
  sku: sku(),
  name: `Profil alumini ${randomUUID().slice(0, 8)}`,
  category: "ALUMINIUM" as const,
  unit: "KG" as const,
  ...overrides,
});

/** Update payloads never carry the SKU. */
const editable = (input: ReturnType<typeof base>) => {
  const rest: Partial<typeof input> = { ...input };
  delete rest.sku;
  return rest as Omit<typeof input, "sku">;
};

const run = <T>(fn: (tx: Tx) => Promise<T>) => asOrg(db, org.orgId, fn, org.director.userId);

async function postAdjustment(productId: string, delta: string, unit: string) {
  await owner.begin(async (tx) => {
    const [event] = await tx<{ id: string }[]>`
      insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
      values (${org.orgId}, 'ADJUSTMENT', 'INVENTORY_ADJUSTMENT', ${randomUUID()}, '2026-10-13', ${org.director.userId})
      returning id`;
    await tx`
      insert into app.stock_movements (org_id, stock_event_id, product_id, quantity_delta, unit,
        source_type, movement_type, source_line_id)
      values (${org.orgId}, ${event!.id}, ${productId}, ${delta}, ${unit}, 'INVENTORY_ADJUSTMENT', 'ADJUSTMENT', ${randomUUID()})`;
    await tx`update app.stock_balances set on_hand = on_hand + ${delta}::numeric where product_id = ${productId}`;
  });
}

async function auditCount(entityId: string, action?: string) {
  const [row] = await owner<{ n: number }[]>`
    select count(*)::int as n from app.audit_events
    where entity_id = ${entityId} ${action ? owner`and action = ${action}` : owner``}`;
  return row!.n;
}

describe("products: create", () => {
  it("normalizes the SKU, stores 3-dp prices, creates the zero balance row and audits", async () => {
    const id = key();
    const result = await createProduct(
      db,
      org.director,
      base({ sku: "  al-x1/a  ", name: "Profil  dritareje", referencePurchasePrice: "12,5" }),
      id,
    );
    const [row] = await owner<
      { sku: string; name: string; reference_purchase_price: string; on_hand: string }[]
    >`select p.sku, p.name, p.reference_purchase_price, b.on_hand from app.products p
      join app.stock_balances b on b.product_id = p.id where p.id = ${result.productId}`;
    expect(row).toEqual({
      sku: "AL-X1/A",
      name: "Profil dritareje",
      reference_purchase_price: "12.500",
      on_hand: "0.000",
    });
    expect(await auditCount(result.productId, "product.create")).toBe(1);
  });

  it("replays the same idempotency key without a second product or audit row", async () => {
    const id = key();
    const input = base();
    const first = await createProduct(db, org.director, input, id);
    const second = await createProduct(db, org.director, input, id);
    expect(second).toEqual({ productId: first.productId, replayed: true });
    expect(await auditCount(first.productId)).toBe(1);
    const reused = await caught(createProduct(db, org.director, base(), id));
    expect((reused as DomainError).code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("rejects a duplicate SKU regardless of letter case, also under concurrency", async () => {
    const value = sku("DUP");
    await createProduct(db, org.director, base({ sku: value }), key());
    const lower = await caught(
      createProduct(db, org.director, base({ sku: value.toLowerCase() }), key()),
    );
    expect((lower as DomainError).code).toBe("SKU_TAKEN");
    expect((lower as DomainError).message).toBe(
      "Kjo SKU ekziston tashmë. Çdo SKU duhet të jetë unike.",
    );

    const race = sku("RACE");
    const results = await Promise.allSettled([
      createProduct(db, org.director, base({ sku: race }), key()),
      createProduct(db, org.accountant, base({ sku: race }), key()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as DomainError).code).toBe("SKU_TAKEN");
  });

  it("allows duplicate display names only after the warning is acknowledged", async () => {
    const name = `Doreza ${randomUUID().slice(0, 6)}`;
    const first = await createProduct(db, org.director, base({ name }), key());
    const warning = await caught(
      createProduct(db, org.director, base({ name: `  ${name.toUpperCase()} ` }), key()),
    );
    expect(warning).toBeInstanceOf(DuplicateWarning);
    expect((warning as DuplicateWarning).matches).toEqual([
      expect.objectContaining({
        id: first.productId,
        reason: "Emër i njëjtë me një produkt tjetër",
      }),
    ]);
    const second = await createProduct(
      db,
      org.director,
      base({ name, acknowledgedDuplicateIds: [first.productId] }),
      key(),
    );
    expect(second.productId).not.toBe(first.productId);
  });

  it("warns when a SKU differs only by separators", async () => {
    const stem = randomUUID().slice(0, 6).toUpperCase();
    const first = await createProduct(db, org.director, base({ sku: `PVC-${stem}` }), key());
    const warning = await caught(
      createProduct(db, org.director, base({ sku: `PVC${stem}` }), key()),
    );
    expect((warning as DuplicateWarning).matches[0]).toMatchObject({
      id: first.productId,
      reason: "SKU shumë e ngjashme (ndryshon vetëm nga shenjat ndarëse)",
    });
  });

  it("rejects a barcode that belongs to another product", async () => {
    const barcode = `${Date.now()}`.slice(-12);
    await createProduct(db, org.director, base({ barcode }), key());
    const error = await caught(createProduct(db, org.director, base({ barcode }), key()));
    expect((error as DomainError).code).toBe("BARCODE_TAKEN");
  });

  it("returns Albanian field errors for invalid input", async () => {
    const error = await caught(
      createProduct(
        db,
        org.director,
        {
          sku: "AL 01ë",
          name: "",
          category: "GLASS" as never,
          unit: "LITER" as never,
          referencePurchasePrice: "12,3456",
        },
        key(),
      ),
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({
      sku: "SKU lejon vetëm shkronja latine, shifra dhe . / _ - (pa hapësira, pa ë/ç).",
      name: "Shkruani emrin e produktit.",
      category: "Zgjidhni kategorinë.",
      unit: "Zgjidhni njësinë: kg, m² ose copë.",
      referencePurchasePrice: "Lejohen deri në 3 shifra pas presjes.",
    });
    const negative = await caught(
      createProduct(db, org.director, base({ referencePurchasePrice: "-1" }), key()),
    );
    expect((negative as ValidationError).fieldErrors.referencePurchasePrice).toBe(
      "Vlera nuk mund të jetë negative.",
    );
    const ambiguous = await caught(
      createProduct(db, org.director, base({ referencePurchasePrice: "1.234,5" }), key()),
    );
    expect((ambiguous as ValidationError).fieldErrors.referencePurchasePrice).toBe(
      "Përdorni vetëm një presje dhjetore dhe asnjë ndarës për mijëshet.",
    );
  });

  it("enforces SKU format in the database as well", async () => {
    await expectSqlState(
      run((tx) =>
        tx.execute(sql`insert into app.products (org_id, sku, name, category, unit)
          values (${org.orgId}, 'al-lower', 'X', 'PVC', 'KG')`),
      ),
      "23514",
    );
  });
});

describe("products: update", () => {
  it("rejects any attempt to change the SKU", async () => {
    const { productId } = await createProduct(db, org.director, base(), key());
    const error = await caught(
      updateProduct(
        db,
        org.director,
        { productId, expectedVersion: 1, ...base(), sku: "NEW-SKU", active: true },
        key(),
      ),
    );
    expect((error as DomainError).code).toBe("SKU_IMMUTABLE");
  });

  it("uses optimistic versions: a stale tab or a concurrent edit is refused", async () => {
    const input = base();
    const { productId } = await createProduct(db, org.director, input, key());
    const edit = (name: string, actor = org.director) =>
      updateProduct(
        db,
        actor,
        { productId, expectedVersion: 1, ...editable(input), name, active: true },
        key(),
      );
    const results = await Promise.allSettled([edit("Emri A"), edit("Emri B", org.accountant)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((loser.reason as DomainError).code).toBe("STALE_VERSION");
    const [row] = await owner<
      { version: number }[]
    >`select version from app.products where id = ${productId}`;
    expect(row!.version).toBe(2);
  });

  it("changes the unit freely before the first stock movement, never afterwards", async () => {
    const input = base();
    const { productId } = await createProduct(db, org.director, input, key());
    const updated = await updateProduct(
      db,
      org.director,
      { productId, expectedVersion: 1, ...editable(input), unit: "M2", active: true },
      key(),
    );
    expect(updated.version).toBe(2);
    await postAdjustment(productId, "1.000", "M2");
    const error = await caught(
      updateProduct(
        db,
        org.director,
        { productId, expectedVersion: 2, ...editable(input), unit: "COPE", active: true },
        key(),
      ),
    );
    expect((error as DomainError).code).toBe("UNIT_LOCKED");
    await expectSqlState(
      run((tx) => tx.execute(sql`update app.products set unit = 'COPE' where id = ${productId}`)),
      "55000",
    );
  });

  it("audits who changed what, with before/after hashes", async () => {
    const input = base();
    const { productId } = await createProduct(db, org.accountant, input, key());
    await updateProduct(
      db,
      org.accountant,
      { productId, expectedVersion: 1, ...editable(input), active: false },
      key(),
    );
    const [event] = await owner<
      { actor_role: string; before_hash: string; after_hash: string; safe_details: unknown }[]
    >`select actor_role, before_hash, after_hash, safe_details from app.audit_events
      where entity_id = ${productId} and action = 'product.update'`;
    expect(event!.actor_role).toBe("ACCOUNTANT");
    expect(event!.before_hash).not.toBe(event!.after_hash);
    expect(event!.safe_details).toMatchObject({ changed: ["active"], active: false });
  });
});

describe("products: approved unit migration (INV-05 exception)", () => {
  async function productWithMovement() {
    const input = base();
    const { productId } = await createProduct(db, org.director, input, key());
    await postAdjustment(productId, "5.000", "KG");
    return productId;
  }

  it("needs a reason, a different approver, zero stock, and applies without conversion", async () => {
    const productId = await productWithMovement();
    const short = await caught(
      requestUnitChange(db, org.director, { productId, toUnit: "M2", reason: "gabim" }, key()),
    );
    expect((short as ValidationError).fieldErrors.reason).toBe("Shkruani të paktën 10 shenja.");

    const { changeId } = await requestUnitChange(
      db,
      org.director,
      { productId, toUnit: "M2", reason: "Njësia u regjistrua gabim në krijim" },
      key(),
    );
    const duplicate = await caught(
      requestUnitChange(
        db,
        org.accountant,
        { productId, toUnit: "COPE", reason: "Kërkesë e dytë për të njëjtin produkt" },
        key(),
      ),
    );
    expect((duplicate as DomainError).code).toBe("UNIT_CHANGE_PENDING");

    const self = await caught(
      decideUnitChange(db, org.director, { changeId, decision: "APPROVE" }, key()),
    );
    expect(self).toBeInstanceOf(AuthorizationError);
    expect((self as AuthorizationError).code).toBe("FOUR_EYES_REQUIRED");

    const notZero = await caught(
      decideUnitChange(db, org.accountant, { changeId, decision: "APPROVE" }, key()),
    );
    expect((notZero as DomainError).code).toBe("UNIT_CHANGE_STOCK_NOT_ZERO");
    expect((notZero as DomainError).message).toContain("5,000 kg");

    await postAdjustment(productId, "-5.000", "KG");
    const approved = await decideUnitChange(
      db,
      org.accountant,
      { changeId, decision: "APPROVE", comment: "Kontrolluar" },
      key(),
    );
    expect(approved.status).toBe("APPROVED_APPLIED");

    const [product] = await owner<{ unit: string; version: number }[]>`
      select unit, version from app.products where id = ${productId}`;
    expect(product).toEqual({ unit: "M2", version: 2 });
    const movements = await owner<{ unit: string }[]>`
      select unit from app.stock_movements where product_id = ${productId}`;
    expect(movements.map((m) => m.unit)).toEqual(["KG", "KG"]);
    const [approval] = await owner<
      { actor_role: string; requester_id: string; decision: string }[]
    >`
      select actor_role, requester_id, decision from app.approvals where subject_id = ${changeId}`;
    expect(approval).toEqual({
      actor_role: "ACCOUNTANT",
      requester_id: org.director.userId,
      decision: "APPROVED",
    });
    expect(await auditCount(productId, "product.unit_change.approve")).toBe(1);
  });

  it("does not let an old approved migration id unlock a later unit change", async () => {
    const productId = await productWithMovement();
    await postAdjustment(productId, "-5.000", "KG");
    const { changeId } = await requestUnitChange(
      db,
      org.accountant,
      { productId, toUnit: "COPE", reason: "Kalim nga kg në copë sipas kontrollit" },
      key(),
    );
    await decideUnitChange(db, org.director, { changeId, decision: "APPROVE" }, key());
    const back = await requestUnitChange(
      db,
      org.director,
      { productId, toUnit: "KG", reason: "Rikthim në kg pas kontrollit të dytë" },
      key(),
    );
    await decideUnitChange(
      db,
      org.accountant,
      { changeId: back.changeId, decision: "APPROVE" },
      key(),
    );
    // Product is KG again; the first approval (KG → COPE) must not be reusable later.
    await expectSqlState(
      run(async (tx) => {
        await tx.execute(sql`select set_config('app.unit_change_id', ${changeId}, true)`);
        await tx.execute(sql`update app.products set unit = 'COPE' where id = ${productId}`);
      }),
      "55000",
    );
  });

  it("refuses while the product is on an open draft document", async () => {
    const productId = await productWithMovement();
    await postAdjustment(productId, "-5.000", "KG");
    await owner.begin(async (tx) => {
      const [customer] = await tx<{ id: string }[]>`
        insert into app.customers (org_id, legal_name) values (${org.orgId}, 'Klient Draft SH.P.K.') returning id`;
      const [sale] = await tx<{ id: string }[]>`
        insert into app.sales (org_id, customer_id, payment_term_days, created_by)
        values (${org.orgId}, ${customer!.id}, 15, ${org.director.userId}) returning id`;
      await tx`insert into app.sale_lines (org_id, sale_id, line_no, product_id, quantity, unit, unit_price_net)
        values (${org.orgId}, ${sale!.id}, 1, ${productId}, 1.000, 'KG', 1.000)`;
    });
    const { changeId } = await requestUnitChange(
      db,
      org.director,
      { productId, toUnit: "M2", reason: "Njësia duhet të jetë m² sipas furnitorit" },
      key(),
    );
    const error = await caught(
      decideUnitChange(db, org.accountant, { changeId, decision: "APPROVE" }, key()),
    );
    expect((error as DomainError).code).toBe("UNIT_CHANGE_OPEN_DRAFTS");
    expect((error as DomainError).message).toContain("Shitje draft");
  });

  it("supports reject (other user) and cancel (requester only)", async () => {
    const productId = await productWithMovement();
    const reason = "Kërkesë provë për refuzim të njësisë";
    const first = await requestUnitChange(
      db,
      org.director,
      { productId, toUnit: "M2", reason },
      key(),
    );
    const notRequester = await caught(
      decideUnitChange(db, org.accountant, { changeId: first.changeId, decision: "CANCEL" }, key()),
    );
    expect((notRequester as DomainError).code).toBe("NOT_REQUESTER");
    const rejected = await decideUnitChange(
      db,
      org.accountant,
      { changeId: first.changeId, decision: "REJECT", comment: "Nuk ka arsye" },
      key(),
    );
    expect(rejected.status).toBe("REJECTED");
    const again = await caught(
      decideUnitChange(
        db,
        org.accountant,
        { changeId: first.changeId, decision: "APPROVE" },
        key(),
      ),
    );
    expect((again as DomainError).code).toBe("UNIT_CHANGE_DECIDED");

    const second = await requestUnitChange(
      db,
      org.director,
      { productId, toUnit: "M2", reason },
      key(),
    );
    const cancelled = await decideUnitChange(
      db,
      org.director,
      { changeId: second.changeId, decision: "CANCEL" },
      key(),
    );
    expect(cancelled.status).toBe("CANCELLED");
    const [product] = await owner<
      { unit: string }[]
    >`select unit from app.products where id = ${productId}`;
    expect(product!.unit).toBe("KG");
  });

  it("is not needed (and refused) for a product without movements", async () => {
    const { productId } = await createProduct(db, org.director, base(), key());
    const error = await caught(
      requestUnitChange(
        db,
        org.director,
        { productId, toUnit: "M2", reason: "Ndryshim pa lëvizje stoku" },
        key(),
      ),
    );
    expect((error as DomainError).code).toBe("UNIT_CHANGE_NOT_NEEDED");
  });
});

describe("products: search", () => {
  let scoped: SeededOrg;
  beforeAll(async () => {
    scoped = await seedOrg(db);
    const values = Array.from({ length: 500 }, (_, i) => {
      const n = String(i).padStart(3, "0");
      return `('${scoped.orgId}', 'AL-${n}', 'Profil alumini ${n}', 'ALUMINIUM', 'KG')`;
    });
    await owner.unsafe(`insert into app.products (org_id, sku, name, category, unit)
      values ${values.join(", ")}`);
    await owner`insert into app.products (org_id, sku, name, category, unit, barcode, active)
      values (${scoped.orgId}, 'ACC-CEL', 'Çelës për dritare', 'ACCESSORY', 'COPE', '3800000000017', true),
             (${scoped.orgId}, 'OLD-1', 'Profil i vjetër', 'OTHER', 'COPE', null, false)`;
  });

  it("ranks exact SKU, then SKU prefix, and searches 500 SKUs quickly", async () => {
    const started = performance.now();
    const rows = await searchProducts(db, scoped.director, { q: "al-12" });
    const elapsed = performance.now() - started;
    expect(rows[0]!.sku).toBe("AL-120");
    expect(rows.slice(0, 10).every((r) => r.sku.startsWith("AL-12"))).toBe(true);
    const exact = await searchProducts(db, scoped.director, { q: "AL-007" });
    expect(exact[0]!.sku).toBe("AL-007");
    expect(elapsed).toBeLessThan(500);
  });

  it("matches names without ë/ç, barcodes exactly, and escapes wildcards", async () => {
    expect((await searchProducts(db, scoped.director, { q: "celes" })).map((r) => r.sku)).toEqual([
      "ACC-CEL",
    ]);
    expect(
      (await searchProducts(db, scoped.director, { q: "3800000000017" })).map((r) => r.sku),
    ).toEqual(["ACC-CEL"]);
    expect(await searchProducts(db, scoped.director, { q: "%" })).toEqual([]);
  });

  it("hides inactive products unless asked", async () => {
    expect(await searchProducts(db, scoped.director, { q: "OLD-1" })).toEqual([]);
    const all = await searchProducts(db, scoped.director, { q: "OLD-1", includeInactive: true });
    expect(all.map((r) => r.sku)).toEqual(["OLD-1"]);
  });

  it("uses the SKU prefix index", async () => {
    const plan = await owner.begin(async (tx) => {
      await tx`set local enable_seqscan = off`;
      return tx<{ "QUERY PLAN": string }[]>`
        explain select id from app.products where org_id = ${scoped.orgId} and sku like 'AL-12%'`;
    });
    expect(plan.map((row) => row["QUERY PLAN"]).join("\n")).toContain("products_sku_prefix_idx");
  });
});

describe("products: authorization and isolation", () => {
  it("requires MFA and an active account for writes", async () => {
    const noMfa = await caught(
      createProduct(db, { ...org.director, mfaVerified: false }, base(), key()),
    );
    expect((noMfa as AuthorizationError).code).toBe("MFA_REQUIRED");

    const temp = await seedOrg(db);
    await setUserStatus(
      db,
      temp.director,
      { userId: temp.accountant.userId, status: "DISABLED" },
      key(),
    );
    const disabled = await caught(createProduct(db, temp.accountant, base(), key()));
    expect((disabled as AuthorizationError).code).toBe("ACCOUNT_INACTIVE");
  });

  it("never reads or writes another organization's product", async () => {
    const input = base();
    const { productId } = await createProduct(db, org.director, input, key());
    const read = await caught(getProduct(db, other.director, productId));
    expect((read as DomainError).code).toBe("NOT_FOUND");
    const write = await caught(
      updateProduct(
        db,
        other.director,
        { productId, expectedVersion: 1, ...editable(input), active: false },
        key(),
      ),
    );
    expect((write as DomainError).code).toBe("NOT_FOUND");
    const found = await searchProducts(db, other.director, { q: input.sku });
    expect(found).toEqual([]);
  });
});
