import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthorizationError } from "@/server/auth/permissions";
import { DomainError, ValidationError } from "@/server/errors";
import { proposeInvoiceSeries, saveCutoverPlan } from "@/server/services/cutover/cutover";
import {
  approveImport,
  getImportBatch,
  uploadImport,
} from "@/server/services/imports/import-batches";
import { assertProductsTradable } from "@/server/services/inventory-tracking";
import { createProduct } from "@/server/services/master-data/products";
import {
  createOpeningBatch,
  getOpeningBatch,
  markCounted,
  reconcileOpeningBatch,
  removeOpeningLine,
  reopenOpeningBatch,
  saveOpeningLine,
  signOffAndPostOpeningBatch,
} from "@/server/services/opening/opening-stock";

import { appHandle, asOrg, expectSqlState, ownerSql, seedOrg, type SeededOrg } from "./helpers";

const { db, close } = appHandle();
const owner = ownerSql();

afterAll(async () => {
  await close();
  await owner.end();
});

const key = () => randomUUID();
const tag = () => randomUUID().slice(0, 6).toUpperCase();
const code = async (promise: Promise<unknown>) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeDefined();
  return (error as { code?: string }).code ?? (error as Error).constructor.name;
};

interface Ctx {
  org: SeededOrg;
  batchId: string;
  products: { id: string; sku: string; unit: "KG" | "M2" | "COPE" }[];
}

async function makeProduct(org: SeededOrg, unit: "KG" | "M2" | "COPE" = "KG") {
  const sku = `OS-${tag()}`;
  const { productId } = await createProduct(
    db,
    org.director,
    { sku, name: `Profil ${sku}`, category: "ALUMINIUM", unit },
    key(),
  );
  return { id: productId, sku, unit };
}

async function setup(productUnits: ("KG" | "M2" | "COPE")[] = ["KG", "M2", "COPE"]): Promise<Ctx> {
  const org = await seedOrg(db);
  await saveCutoverPlan(
    db,
    org.director,
    { plannedCutoverDate: "2027-01-01", lastExcelDay: "2026-12-31" },
    key(),
  );
  const { batchId } = await createOpeningBatch(db, org.director, key());
  const products = [];
  for (const unit of productUnits) products.push(await makeProduct(org, unit));
  return { org, batchId, products };
}

const line = (
  ctx: Ctx,
  index: number,
  status: "VERIFIED_QTY" | "VERIFIED_ZERO" | "UNKNOWN",
  quantity?: string,
) =>
  saveOpeningLine(
    db,
    ctx.org.accountant,
    { batchId: ctx.batchId, productId: ctx.products[index]!.id, status, quantity },
    key(),
  );

const reconcile = (ctx: Ctx, note = "Rakordim me listën Excel të ditës së fundit.") =>
  reconcileOpeningBatch(db, ctx.org.accountant, { batchId: ctx.batchId, note }, key());

async function readyToSign(ctx: Ctx) {
  await line(ctx, 0, "VERIFIED_QTY", "12,5");
  await line(ctx, 1, "VERIFIED_ZERO");
  await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
  const { linesHash } = await reconcile(ctx);
  return linesHash;
}

const sign = (ctx: Ctx, hash: string, unknown = 1, actor = ctx.org.director) =>
  signOffAndPostOpeningBatch(
    db,
    actor,
    { batchId: ctx.batchId, expectedLinesHash: hash, acknowledgedUnknownCount: unknown },
    key(),
  );

describe("cutover plan", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
  });

  it("computes the cutover instant at Kosovo midnight in the database", async () => {
    await saveCutoverPlan(
      db,
      org.director,
      { plannedCutoverDate: "2027-07-01", lastExcelDay: "2027-06-30" },
      key(),
    );
    const [row] = await owner<{ at: string }[]>`
      select to_char(cutover_instant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as at
      from app.cutover_plans where org_id = ${org.orgId}`;
    expect(row!.at).toBe("2027-06-30T22:00"); // CEST: UTC+2
  });

  it("requires acknowledgement for a start that is not the first of a month", async () => {
    await expect(
      saveCutoverPlan(
        db,
        org.director,
        { plannedCutoverDate: "2027-07-15", lastExcelDay: "2027-07-14" },
        key(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    await saveCutoverPlan(
      db,
      org.director,
      { plannedCutoverDate: "2027-07-15", lastExcelDay: "2027-07-14", midMonthAcknowledged: true },
      key(),
    );
  });

  it("the last Excel day must precede the start date", async () => {
    await expect(
      saveCutoverPlan(
        db,
        org.director,
        { plannedCutoverDate: "2027-07-01", lastExcelDay: "2027-07-01" },
        key(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("is idempotent for the same key", async () => {
    const o = await seedOrg(db);
    const k = key();
    const input = { plannedCutoverDate: "2027-03-01", lastExcelDay: "2027-02-28" };
    const a = await saveCutoverPlan(db, o.director, input, k);
    const b = await saveCutoverPlan(db, o.director, input, k);
    expect(b.replayed).toBe(true);
    expect(b.planId).toBe(a.planId);
  });

  it("the batch counted-as-of day follows a plan edit while DRAFT, and dates freeze after counting", async () => {
    const ctx = await setup();
    await saveCutoverPlan(
      db,
      ctx.org.director,
      { plannedCutoverDate: "2027-02-01", lastExcelDay: "2027-01-31" },
      key(),
    );
    const view = await getOpeningBatch(db, ctx.org.director, ctx.batchId);
    expect(view.batch.countedAsOf).toBe("2027-01-31");
    await line(ctx, 0, "VERIFIED_QTY", "1");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    expect(
      await code(
        saveCutoverPlan(
          db,
          ctx.org.director,
          { plannedCutoverDate: "2027-03-01", lastExcelDay: "2027-02-28" },
          key(),
        ),
      ),
    ).toBe("CUTOVER_COUNTING_DONE");
  });

  it("an accountant and a director may both write the plan; MFA is required", async () => {
    const o = await seedOrg(db);
    await expect(
      saveCutoverPlan(
        db,
        { ...o.accountant, mfaVerified: false },
        { plannedCutoverDate: "2027-03-01", lastExcelDay: "2027-02-28" },
        key(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await saveCutoverPlan(
      db,
      o.accountant,
      { plannedCutoverDate: "2027-03-01", lastExcelDay: "2027-02-28" },
      key(),
    );
  });
});

describe("invoice series (collected only, nothing issued)", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
    await saveCutoverPlan(
      db,
      org.director,
      { plannedCutoverDate: "2027-01-01", lastExcelDay: "2026-12-31" },
      key(),
    );
  });

  it("the series year must be the year of the start date", async () => {
    expect(
      await code(
        proposeInvoiceSeries(
          db,
          org.director,
          { fiscalYear: 2026, code: "FA", noInvoicesYet: true },
          key(),
        ),
      ),
    ).toBe("SERIES_YEAR_MISMATCH");
  });

  it("a legacy number needs the last Excel day in the same year", async () => {
    expect(
      await code(
        proposeInvoiceSeries(
          db,
          org.director,
          { fiscalYear: 2027, code: "FA", legacyLastNumber: "41" },
          key(),
        ),
      ),
    ).toBe("SERIES_LEGACY_YEAR");
  });

  it("needs either a number or an explicit 'no invoices yet', never both", async () => {
    await expect(
      proposeInvoiceSeries(db, org.director, { fiscalYear: 2027, code: "FA" }, key()),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      proposeInvoiceSeries(
        db,
        org.director,
        { fiscalYear: 2027, code: "FA", legacyLastNumber: "3", noInvoicesYet: true },
        key(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("stores the proposal as PROPOSED with next number 1 and issues no invoice", async () => {
    const { seriesId } = await proposeInvoiceSeries(
      db,
      org.director,
      { fiscalYear: 2027, code: "fa", noInvoicesYet: true },
      key(),
    );
    const [row] = await owner<
      { status: string; code: string; next_number: number; legacy: number | null }[]
    >`
      select status, code, next_number, legacy_last_number as legacy from app.invoice_series where id = ${seriesId}`;
    expect(row).toMatchObject({ status: "PROPOSED", code: "FA", next_number: 1, legacy: null });
    const [invoices] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.tax_invoices where org_id = ${org.orgId}`;
    expect(invoices!.n).toBe("0");
  });

  it("a mid-year start continues from the legacy number", async () => {
    const o = await seedOrg(db);
    await saveCutoverPlan(
      db,
      o.director,
      { plannedCutoverDate: "2027-07-01", lastExcelDay: "2027-06-30" },
      key(),
    );
    const { seriesId } = await proposeInvoiceSeries(
      db,
      o.accountant,
      { fiscalYear: 2027, code: "FA", legacyLastNumber: "148" },
      key(),
    );
    const [row] = await owner<
      { next_number: number }[]
    >`select next_number from app.invoice_series where id = ${seriesId}`;
    expect(row!.next_number).toBe(149);
  });

  it("a decided series cannot be changed (database guard)", async () => {
    const o = await seedOrg(db);
    await saveCutoverPlan(
      db,
      o.director,
      { plannedCutoverDate: "2027-01-01", lastExcelDay: "2026-12-31" },
      key(),
    );
    const { seriesId } = await proposeInvoiceSeries(
      db,
      o.director,
      { fiscalYear: 2027, code: "FA", noInvoicesYet: true },
      key(),
    );
    await owner`update app.invoice_series set status = 'REJECTED' where id = ${seriesId}`;
    await expectSqlState(
      owner`update app.invoice_series set code = 'XX' where id = ${seriesId}`,
      "55000",
    );
    expect(
      await code(
        proposeInvoiceSeries(
          db,
          o.director,
          { fiscalYear: 2027, code: "FB", noInvoicesYet: true },
          key(),
        ),
      ),
    ).toBe("SERIES_DECIDED");
  });
});

describe("opening stock — counting", () => {
  it("distinguishes verified zero, verified quantity and UNKNOWN; blank is never zero", async () => {
    const ctx = await setup();
    await line(ctx, 0, "VERIFIED_QTY", "7,250");
    await line(ctx, 1, "VERIFIED_ZERO");
    await line(ctx, 2, "UNKNOWN");
    const view = await getOpeningBatch(db, ctx.org.director, ctx.batchId);
    expect(view.counts).toMatchObject({
      verifiedQty: 1,
      verifiedZero: 1,
      unknown: 1,
      unverifiedProducts: 1,
    });
    await expect(line(ctx, 0, "VERIFIED_QTY", "")).rejects.toBeInstanceOf(ValidationError);
    await expect(line(ctx, 0, "VERIFIED_QTY", "0")).rejects.toBeInstanceOf(ValidationError);
    await expect(line(ctx, 0, "VERIFIED_QTY", "1,2345")).rejects.toBeInstanceOf(ValidationError);
    await expect(line(ctx, 0, "VERIFIED_QTY", "-3")).rejects.toBeInstanceOf(ValidationError);
  });

  it("lines freeze when counting is complete and thaw again on reopen", async () => {
    const ctx = await setup();
    await line(ctx, 0, "VERIFIED_QTY", "5");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    expect(await code(line(ctx, 1, "VERIFIED_ZERO"))).toBe("OPENING_NOT_EDITABLE");
    expect(
      await code(
        removeOpeningLine(
          db,
          ctx.org.accountant,
          { batchId: ctx.batchId, productId: ctx.products[0]!.id },
          key(),
        ),
      ),
    ).toBe("OPENING_NOT_EDITABLE");
    await expectSqlState(
      owner`update app.opening_stock_lines set quantity = 6 where batch_id = ${ctx.batchId}`,
      "55000",
    );
    await reopenOpeningBatch(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    await line(ctx, 1, "VERIFIED_ZERO");
  });

  it("an empty count cannot be completed", async () => {
    const ctx = await setup();
    expect(await code(markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key()))).toBe(
      "OPENING_EMPTY",
    );
  });

  it("is not visible to or writable by another organization", async () => {
    const ctx = await setup();
    const other = await seedOrg(db);
    await expect(getOpeningBatch(db, other.director, ctx.batchId)).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(
      saveOpeningLine(
        db,
        other.accountant,
        { batchId: ctx.batchId, productId: ctx.products[0]!.id, status: "UNKNOWN" },
        key(),
      ),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe("opening stock — import of the physical count sheet", () => {
  it("fills the DRAFT batch lines only; unit mismatch, unknown SKU and blank quantity are handled per row", async () => {
    const ctx = await setup(["KG", "M2"]);
    const [a, b] = ctx.products;
    const bytes = new TextEncoder().encode(
      [
        "SKU;Njesia;Sasia",
        `${a!.sku};kg;12,5`,
        `${b!.sku};kg;4`, // unit differs from the product (m²)
        `NUK-EKZISTON-${tag()};kg;1`, // unknown SKU: no product is invented
      ].join("\n"),
    );
    const { batchId } = await uploadImport(
      db,
      ctx.org.accountant,
      { kind: "OPENING_STOCK", fileName: "numerimi.csv", targetOpeningBatchId: ctx.batchId, bytes },
      key(),
    );
    const detail = await getImportBatch(db, ctx.org.accountant, batchId);
    expect(detail.batch.errorCount).toBe(2);
    expect(
      await code(
        approveImport(
          db,
          ctx.org.accountant,
          { batchId, mode: "ALL_OR_NOTHING", expectedPreviewHash: detail.batch.previewHash! },
          key(),
        ),
      ),
    ).toBeDefined();
    const none = await getOpeningBatch(db, ctx.org.accountant, ctx.batchId);
    expect(none.counts.total).toBe(0);

    const result = await approveImport(
      db,
      ctx.org.accountant,
      {
        batchId,
        mode: "REVIEWED_PARTIAL",
        acknowledgedErrorRows: 2,
        expectedPreviewHash: detail.batch.previewHash!,
      },
      key(),
    );
    expect(result.approvedRows).toBe(1);
    const view = await getOpeningBatch(db, ctx.org.accountant, ctx.batchId);
    expect(view.counts.verifiedQty).toBe(1);
    const [movements] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.stock_movements where org_id = ${ctx.org.orgId}`;
    expect(movements!.n).toBe("0");
    const [balance] = await owner<
      { on_hand: string }[]
    >`select on_hand::text from app.stock_balances where product_id = ${a!.id}`;
    expect(balance!.on_hand).toBe("0.000");
  });

  it("a blank quantity becomes UNKNOWN, a typed zero becomes verified zero", async () => {
    const ctx = await setup(["KG", "KG"]);
    const bytes = new TextEncoder().encode(
      ["SKU;Njesia;Sasia", `${ctx.products[0]!.sku};kg;`, `${ctx.products[1]!.sku};kg;0`].join(
        "\n",
      ),
    );
    const { batchId } = await uploadImport(
      db,
      ctx.org.accountant,
      { kind: "OPENING_STOCK", fileName: "zero.csv", targetOpeningBatchId: ctx.batchId, bytes },
      key(),
    );
    const detail = await getImportBatch(db, ctx.org.accountant, batchId);
    await approveImport(
      db,
      ctx.org.accountant,
      {
        batchId,
        mode: "ALL_OR_NOTHING",
        acknowledgeWarnings: true,
        expectedPreviewHash: detail.batch.previewHash!,
      },
      key(),
    );
    const view = await getOpeningBatch(db, ctx.org.accountant, ctx.batchId);
    expect(view.counts).toMatchObject({ verifiedZero: 1, unknown: 1, verifiedQty: 0 });
  });
});

describe("opening stock — reconciliation and sign-off", () => {
  it("only the accountant reconciles and only the director signs", async () => {
    const ctx = await setup();
    await line(ctx, 0, "VERIFIED_QTY", "3");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    await expect(
      reconcileOpeningBatch(
        db,
        ctx.org.director,
        { batchId: ctx.batchId, note: "Rakordim i detajuar" },
        key(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      reconcileOpeningBatch(
        db,
        ctx.org.accountant,
        { batchId: ctx.batchId, note: "shkurt" },
        key(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    const { linesHash } = await reconcile(ctx);
    await expect(sign(ctx, linesHash, 2, ctx.org.accountant)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("sign-off needs the exact hash and the acknowledged UNKNOWN count", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    expect(await code(sign(ctx, "0".repeat(64)))).toBe("OPENING_CHANGED");
    expect(await code(sign(ctx, hash, 0))).toBe("UNKNOWN_COUNT_MISMATCH");
    const view = await getOpeningBatch(db, ctx.org.director, ctx.batchId);
    expect(view.batch.status).toBe("RECONCILED");
  });

  it("reopening a reconciled batch invalidates the approval and demands a new reconciliation", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    await reopenOpeningBatch(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    const [approval] = await owner<{ decision: string }[]>`
      select decision from app.approvals where subject_id = ${ctx.batchId} and approval_kind = 'OPENING_RECONCILED'`;
    expect(approval!.decision).toBe("INVALIDATED");
    expect(await code(sign(ctx, hash))).toBe("OPENING_WRONG_STATE");
  });

  it("the database refuses to skip reconciliation or forge a sign-off", async () => {
    const ctx = await setup();
    await line(ctx, 0, "VERIFIED_QTY", "3");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    await expectSqlState(
      owner`update app.opening_stock_batches set status = 'SIGNED_OFF' where id = ${ctx.batchId}`,
      "55000",
    );
    await expectSqlState(
      owner`update app.opening_stock_batches set status = 'POSTED' where id = ${ctx.batchId}`,
      "55000",
    );
    await expectSqlState(
      owner`update app.opening_stock_batches set status = 'RECONCILED', reconciled_by = ${ctx.org.accountant.userId},
            reconciled_at = now(), reconciliation_note = 'Shënim i gjatë mjaftueshëm' where id = ${ctx.batchId}`,
      "23514",
    );
  });
});

describe("opening stock — posting", () => {
  it("posts one OPENING event at the cutover instant, one movement per quantity, and the balances", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    const result = await sign(ctx, hash);
    expect(result.movementCount).toBe(1);

    const [event] = await owner<{ at: string; date: string; type: string; src: string }[]>`
      select to_char(effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as at, document_date::text as date,
             event_type as type, source_type as src
      from app.stock_events where id = ${result.stockEventId}`;
    expect(event).toEqual({
      at: "2026-12-31T23:00",
      date: "2027-01-01",
      type: "OPENING",
      src: "OPENING_STOCK_BATCH",
    });

    const [bal] = await owner<
      { on_hand: string }[]
    >`select on_hand::text from app.stock_balances where product_id = ${ctx.products[0]!.id}`;
    expect(bal!.on_hand).toBe("12.500");
    const [zero] = await owner<
      { on_hand: string }[]
    >`select on_hand::text from app.stock_balances where product_id = ${ctx.products[1]!.id}`;
    expect(zero!.on_hand).toBe("0.000");
    const [ledger] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.stock_movements where stock_event_id = ${result.stockEventId}`;
    expect(ledger!.n).toBe("1");

    const view = await getOpeningBatch(db, ctx.org.director, ctx.batchId);
    expect(view.batch.status).toBe("POSTED");
    expect(view.plan!.status).toBe("LOCKED");
    expect(view.batch.unknownAcknowledgedCount).toBe(1);
  });

  it("a second post is rejected and nothing is added", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    await sign(ctx, hash);
    expect(await code(sign(ctx, hash))).toBe("OPENING_ALREADY_POSTED");
    const [n] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.stock_events where org_id = ${ctx.org.orgId}`;
    expect(n!.n).toBe("1");
  });

  it("is idempotent for the same key", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    const k = key();
    const input = { batchId: ctx.batchId, expectedLinesHash: hash, acknowledgedUnknownCount: 1 };
    const one = await signOffAndPostOpeningBatch(db, ctx.org.director, input, k);
    const two = await signOffAndPostOpeningBatch(db, ctx.org.director, input, k);
    expect(two.replayed).toBe(true);
    expect(two.stockEventId).toBe(one.stockEventId);
  });

  it("a concurrent double post produces exactly one event", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    const settled = await Promise.allSettled([sign(ctx, hash), sign(ctx, hash)]);
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    const [n] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.stock_movements where org_id = ${ctx.org.orgId}`;
    expect(n!.n).toBe("1");
  });

  it("posted data is immutable: batch, lines, plan, event and movements", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    const { stockEventId } = await sign(ctx, hash);
    await expectSqlState(
      owner`update app.opening_stock_batches set status = 'DRAFT' where id = ${ctx.batchId}`,
      "55000",
    );
    await expectSqlState(
      owner`update app.opening_stock_lines set quantity = 99 where batch_id = ${ctx.batchId} and status = 'VERIFIED_QTY'`,
      "55000",
    );
    await expectSqlState(
      owner`delete from app.opening_stock_lines where batch_id = ${ctx.batchId}`,
      "55000",
    );
    await expectSqlState(
      owner`update app.cutover_plans set planned_cutover_date = '2027-02-01' where org_id = ${ctx.org.orgId}`,
      "55000",
    );
    await expectSqlState(
      owner`update app.stock_events set document_date = '2027-02-01' where id = ${stockEventId}`,
      "55000",
    );
    await expectSqlState(
      owner`delete from app.stock_movements where stock_event_id = ${stockEventId}`,
      "55000",
    );
    await expect(
      saveCutoverPlan(
        db,
        ctx.org.director,
        { plannedCutoverDate: "2027-02-01", lastExcelDay: "2027-01-31" },
        key(),
      ),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("a failure in the middle of posting rolls back everything, and a retry then succeeds", async () => {
    const ctx = await setup();
    const hash = await readyToSign(ctx);
    const fn = `poison_${tag().toLowerCase()}`;
    await owner.unsafe(`create function app.${fn}() returns trigger language plpgsql as $$
      begin
        if new.on_hand = 12.5 then raise exception 'poison' using errcode = 'P0001'; end if;
        return new;
      end $$`);
    await owner.unsafe(`create trigger ${fn} before update on app.stock_balances
      for each row execute function app.${fn}()`);
    try {
      await expectSqlState(sign(ctx, hash), "P0001");
      const [state] = await owner<
        { status: string; plan: string; events: string; moves: string; approvals: string }[]
      >`
        select (select status from app.opening_stock_batches where id = ${ctx.batchId}) as status,
               (select status from app.cutover_plans where org_id = ${ctx.org.orgId}) as plan,
               (select count(*)::text from app.stock_events where org_id = ${ctx.org.orgId}) as events,
               (select count(*)::text from app.stock_movements where org_id = ${ctx.org.orgId}) as moves,
               (select count(*)::text from app.approvals where subject_id = ${ctx.batchId} and approval_kind = 'OPENING_SIGNOFF') as approvals`;
      expect(state).toEqual({
        status: "RECONCILED",
        plan: "DRAFT",
        events: "0",
        moves: "0",
        approvals: "0",
      });
    } finally {
      await owner.unsafe(`drop trigger ${fn} on app.stock_balances`);
      await owner.unsafe(`drop function app.${fn}()`);
    }
    const retry = await sign(ctx, hash);
    expect(retry.movementCount).toBe(1);
  });
});

describe("opening stock — unknown status blocks sales (INV-08)", () => {
  async function attemptSaleMovement(
    orgId: string,
    userId: string,
    productId: string,
    unit: string,
    type = "SALE_FULFILLMENT",
  ) {
    const source = type === "SALE_FULFILLMENT" ? "FULFILLMENT" : "GOODS_RECEIPT";
    return owner.begin(async (tx) => {
      const [event] = await tx<{ id: string }[]>`
        insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
        values (${orgId}, ${type}, ${source}, ${randomUUID()}, '2027-01-05', ${userId}) returning id`;
      const delta = type === "SALE_FULFILLMENT" ? "-1" : "1";
      await tx`insert into app.stock_movements (org_id, stock_event_id, product_id, quantity_delta, unit,
          source_type, movement_type, source_line_id)
        values (${orgId}, ${event!.id}, ${productId}, ${delta}, ${unit}, ${source}, ${type}, ${randomUUID()})`;
    });
  }

  it("every product is UNKNOWN before any opening batch is posted", async () => {
    const ctx = await setup();
    await expect(
      asOrg(db, ctx.org.orgId, (tx) => assertProductsTradable(tx, [ctx.products[0]!.id])),
    ).rejects.toMatchObject({ code: "STOCK_STATUS_UNKNOWN" });
    await expectSqlState(
      attemptSaleMovement(
        ctx.org.orgId,
        ctx.org.director.userId,
        ctx.products[0]!.id,
        "KG",
        "PURCHASE_RECEIPT",
      ),
      "55000",
    );
  });

  it("verified quantity and verified zero are KNOWN; UNKNOWN and uncounted products stay blocked", async () => {
    const ctx = await setup();
    await line(ctx, 0, "VERIFIED_QTY", "10");
    await line(ctx, 1, "VERIFIED_ZERO");
    await line(ctx, 2, "UNKNOWN");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    const { linesHash } = await reconcile(ctx);
    await sign(ctx, linesHash, 1);

    const [known, zero, unknown] = ctx.products;
    await asOrg(db, ctx.org.orgId, (tx) => assertProductsTradable(tx, [known!.id, zero!.id]));
    await expect(
      asOrg(db, ctx.org.orgId, (tx) => assertProductsTradable(tx, [unknown!.id])),
    ).rejects.toMatchObject({
      code: "STOCK_STATUS_UNKNOWN",
    });
    await expectSqlState(
      attemptSaleMovement(ctx.org.orgId, ctx.org.director.userId, unknown!.id, unknown!.unit),
      "55000",
    );
  });

  it("a product created after posting is KNOWN with zero stock; a product unknown at posting is not", async () => {
    const ctx = await setup(["KG"]);
    await line(ctx, 0, "VERIFIED_QTY", "2");
    await markCounted(db, ctx.org.accountant, { batchId: ctx.batchId }, key());
    const { linesHash } = await reconcile(ctx);
    await sign(ctx, linesHash, 0);
    const late = await makeProduct(ctx.org, "COPE");
    await asOrg(db, ctx.org.orgId, (tx) => assertProductsTradable(tx, [late.id]));
  });

  it("a movement of type OPENING cannot be inserted outside a signed-off batch", async () => {
    const ctx = await setup();
    await expectSqlState(
      owner.begin(async (tx) => {
        await tx`insert into app.stock_events (org_id, event_type, source_type, source_id, document_date, posted_by)
          values (${ctx.org.orgId}, 'OPENING', 'OPENING_STOCK_BATCH', ${ctx.batchId}, '2027-01-01', ${ctx.org.director.userId})`;
      }),
      "23514",
    );
  });
});
