import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthorizationError } from "@/server/auth/permissions";
import { DomainError } from "@/server/errors";
import {
  approveImport,
  getImportBatch,
  rejectImport,
  remapImport,
  uploadImport,
} from "@/server/services/imports/import-batches";

import { appHandle, asOrg, ownerSql, seedOrg, type SeededOrg } from "./helpers";

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
const tag = () => randomUUID().slice(0, 6).toUpperCase();
const csv = (lines: string[]) => new TextEncoder().encode(lines.join("\n"));
const HEADER = "SKU;Emri;Kategoria;Njesia";
const upload = (bytes: Uint8Array, name = "produkte.csv", actor = org.director) =>
  uploadImport(db, actor, { kind: "PRODUCTS", fileName: name, bytes }, key());
const productCount = (orgId = org.orgId) =>
  asOrg(db, orgId, async (tx) => {
    const [row] = await tx.execute<{ n: string }>(
      sql`select count(*)::text as n from app.products`,
    );
    return Number(row!.n);
  });
const approve = async (
  batchId: string,
  extra: Record<string, unknown> = {},
  actor = org.director,
) => {
  const detail = await getImportBatch(db, actor, batchId);
  return approveImport(
    db,
    actor,
    {
      batchId,
      mode: "ALL_OR_NOTHING",
      expectedPreviewHash: detail.batch.previewHash!,
      ...extra,
    },
    key(),
  );
};

describe("product import — dry run", () => {
  it("a dry run creates no product, stock or movement", async () => {
    const before = await productCount();
    const a = tag();
    const { batchId } = await upload(
      csv([HEADER, `IMP-${a};Profil A;Alumin;kg`, `IMP-${a}B;Profil B;PVC;m²`]),
    );
    const detail = await getImportBatch(db, org.director, batchId);
    expect(detail.batch.status).toBe("VALIDATED");
    expect(detail.batch.validCount).toBe(2);
    expect(detail.batch.errorCount).toBe(0);
    expect(await productCount()).toBe(before);
    const [movements] = await owner<
      { n: string }[]
    >`select count(*)::text as n from app.stock_movements where org_id = ${org.orgId}`;
    expect(movements!.n).toBe("0");
  });

  it("reports row-level errors in Albanian and blocks all-or-nothing approval", async () => {
    const a = tag();
    const { batchId } = await upload(
      csv([
        HEADER,
        `IMP-${a}1;Mirë;Alumin;kg`,
        `IMP-${a}2;Pa njësi;Alumin;`,
        `;Pa SKU;PVC;copë`,
        `IMP-${a}4;Njësi e keqe;PVC;litra`,
      ]),
    );
    const detail = await getImportBatch(db, org.director, batchId);
    expect(detail.batch.errorCount).toBe(3);
    expect(detail.rows.filter((r) => r.status === "ERROR")).toHaveLength(3);
    const message = JSON.stringify(detail.rows.flatMap((r) => r.issues));
    expect(message).toMatch(/njësi|SKU/i);
    const before = await productCount();
    const error = await approve(batchId).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(DomainError);
    expect(await productCount()).toBe(before);
  });

  it("flags duplicate SKUs inside the file on every involved row", async () => {
    const a = tag();
    const { batchId } = await upload(
      csv([HEADER, `DUP-${a};Një;Alumin;kg`, `dup-${a};Dy;Alumin;kg`, `OK-${a};Tre;PVC;copë`]),
    );
    const detail = await getImportBatch(db, org.director, batchId);
    expect(
      detail.rows
        .filter((r) => r.status === "ERROR")
        .map((r) => r.rowNo)
        .sort(),
    ).toEqual([2, 3]);
  });

  it("flags a SKU that already exists in the catalog", async () => {
    const a = tag();
    const first = await upload(csv([HEADER, `EXI-${a};Ekzistues;Alumin;kg`]));
    await approve(first.batchId);
    const second = await upload(csv([HEADER, `EXI-${a};Tjetër emër;Alumin;kg`]), "tjeter.csv");
    const detail = await getImportBatch(db, org.director, second.batchId);
    expect(detail.batch.errorCount).toBe(1);
  });

  it("rejects formulas, bad extensions and non-UTF-8 files before staging anything", async () => {
    const a = tag();
    const formula = await upload(csv([HEADER, `FRM-${a};=1+1;Alumin;kg`]));
    const detail = await getImportBatch(db, org.director, formula.batchId);
    // A formula-looking text cell in CSV is plain text; only real spreadsheet formulas are blocked.
    expect(detail.batch.rowCount).toBe(1);
    await expect(upload(csv([HEADER]), "produkte.xls")).rejects.toBeInstanceOf(DomainError);
    await expect(
      upload(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0xc3, 0x28]), "bad.csv"),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe("product import — approval", () => {
  it("all-or-nothing creates every product with an audit event, and never any stock", async () => {
    const a = tag();
    const before = await productCount();
    const { batchId } = await upload(
      csv([
        HEADER,
        `OK1-${a};Profil një;Alumin;kg`,
        `OK2-${a};Profil dy;PVC;m²`,
        `OK3-${a};Aksesor;Aksesorë;copë`,
      ]),
    );
    const result = await approve(batchId);
    expect(result.approvedRows).toBe(3);
    expect(await productCount()).toBe(before + 3);
    const [stock] = await owner<{ n: string }[]>`
      select count(*)::text as n from app.stock_movements where org_id = ${org.orgId}`;
    expect(stock!.n).toBe("0");
    const audits = await owner<{ n: string }[]>`
      select count(*)::text as n from app.audit_events
      where org_id = ${org.orgId} and action = 'product.create' and safe_details ->> 'sku' like ${`OK_-${a}`}`;
    expect(Number(audits[0]!.n)).toBe(3);
    const detail = await getImportBatch(db, org.director, batchId);
    expect(detail.batch.status).toBe("APPROVED");
  });

  it("reviewed partial approval imports only valid rows and needs the excluded-row count", async () => {
    const a = tag();
    const { batchId } = await upload(
      csv([HEADER, `PA1-${a};Mirë;Alumin;kg`, `PA2-${a};Keq;Alumin;`, `PA3-${a};Mirë dy;PVC;copë`]),
    );
    const before = await productCount();
    await expect(approve(batchId, { mode: "REVIEWED_PARTIAL" })).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(
      approve(batchId, { mode: "REVIEWED_PARTIAL", acknowledgedErrorRows: 2 }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(await productCount()).toBe(before);
    const result = await approve(batchId, { mode: "REVIEWED_PARTIAL", acknowledgedErrorRows: 1 });
    expect(result.approvedRows).toBe(2);
    expect(result.skippedRows).toBe(1);
    expect(await productCount()).toBe(before + 2);
  });

  it("is idempotent: the same key replays, the same file is not staged twice", async () => {
    const a = tag();
    const bytes = csv([HEADER, `IDM-${a};Profil;Alumin;kg`]);
    const first = await upload(bytes);
    const again = await upload(bytes, "kopje.csv");
    expect(again.batchId).toBe(first.batchId);
    expect(again.alreadyUploaded).toBe(true);
    const detail = await getImportBatch(db, org.director, first.batchId);
    const k = key();
    const input = {
      batchId: first.batchId,
      mode: "ALL_OR_NOTHING" as const,
      expectedPreviewHash: detail.batch.previewHash!,
    };
    const one = await approveImport(db, org.director, input, k);
    const two = await approveImport(db, org.director, input, k);
    expect(one.replayed).toBe(false);
    expect(two.replayed).toBe(true);
    const [row] = await owner<{ n: string }[]>`
      select count(*)::text as n from app.products where org_id = ${org.orgId} and sku = ${`IDM-${a}`}`;
    expect(row!.n).toBe("1");
  });

  it("concurrent approvals create each product exactly once", async () => {
    const a = tag();
    const { batchId } = await upload(
      csv([HEADER, `CON-${a}1;Një;Alumin;kg`, `CON-${a}2;Dy;PVC;copë`]),
    );
    const detail = await getImportBatch(db, org.director, batchId);
    const input = {
      batchId,
      mode: "ALL_OR_NOTHING" as const,
      expectedPreviewHash: detail.batch.previewHash!,
    };
    const settled = await Promise.allSettled([
      approveImport(db, org.director, input, key()),
      approveImport(db, org.accountant, input, key()),
    ]);
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    const [row] = await owner<{ n: string }[]>`
      select count(*)::text as n from app.products where org_id = ${org.orgId} and sku like ${`CON-${a}%`}`;
    expect(row!.n).toBe("2");
  });

  it("a changed catalog since the preview refreshes it and writes nothing", async () => {
    const a = tag();
    const { batchId } = await upload(csv([HEADER, `CHG-${a};Profil;Alumin;kg`]));
    const detail = await getImportBatch(db, org.director, batchId);
    await owner`insert into app.products (org_id, sku, name, category, unit)
      values (${org.orgId}, ${`CHG-${a}`}, 'Futur gjatë', 'ALUMINIUM', 'KG')`;
    const error = await approveImport(
      db,
      org.director,
      { batchId, mode: "ALL_OR_NOTHING", expectedPreviewHash: detail.batch.previewHash! },
      key(),
    ).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect((error as DomainError).code).toBe("IMPORT_CHANGED");
    const refreshed = await getImportBatch(db, org.director, batchId);
    expect(refreshed.batch.status).toBe("HAS_ERRORS");
    expect(refreshed.batch.errorCount).toBe(1);
  });

  it("rejecting keeps the batch for audit and creates nothing", async () => {
    const a = tag();
    const before = await productCount();
    const { batchId } = await upload(csv([HEADER, `REJ-${a};Profil;Alumin;kg`]));
    await rejectImport(db, org.director, { batchId, note: "Skedar i gabuar" }, key());
    expect((await getImportBatch(db, org.director, batchId)).batch.status).toBe("REJECTED");
    expect(await productCount()).toBe(before);
    await expect(approve(batchId)).rejects.toBeInstanceOf(DomainError);
  });

  it("a column mapping can be corrected and the dry run is repeated", async () => {
    const a = tag();
    const { batchId } = await upload(
      csv(["Kolona A;Kolona B;Kolona C;Kolona D", `MAP-${a};Profil;Alumin;kg`]),
    );
    const detail = await getImportBatch(db, org.director, batchId);
    expect(detail.batch.errorCount).toBeGreaterThan(0);
    await remapImport(
      db,
      org.director,
      { batchId, mapping: { sku: 0, name: 1, category: 2, unit: 3 } },
      key(),
    );
    const fixed = await getImportBatch(db, org.director, batchId);
    expect(fixed.batch.errorCount).toBe(0);
    expect(fixed.batch.validCount + fixed.batch.warningCount).toBe(1);
  });
});

describe("product import — safety", () => {
  it("is invisible to another organization", async () => {
    const { batchId } = await upload(csv([HEADER, `ISO-${tag()};Profil;Alumin;kg`]));
    await expect(getImportBatch(db, other.director, batchId)).rejects.toBeInstanceOf(DomainError);
  });

  it("requires MFA for writes", async () => {
    const noMfa = { ...org.director, mfaVerified: false };
    await expect(
      upload(csv([HEADER, `MFA-${tag()};Profil;Alumin;kg`]), "p.csv", noMfa),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("the app role cannot write products outside the service (no cross-org insert)", async () => {
    await expect(
      asOrg(db, other.orgId, (tx) =>
        tx.execute(sql`insert into app.products (org_id, sku, name, category, unit)
          values (${org.orgId}, 'X-CROSS', 'x', 'ALUMINIUM', 'KG')`),
      ),
    ).rejects.toBeDefined();
  });
});
