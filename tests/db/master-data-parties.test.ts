import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthorizationError } from "@/server/auth/permissions";
import { runInTransaction } from "@/server/db/client";
import { DomainError, DuplicateWarning, ValidationError } from "@/server/errors";
import {
  createCustomer,
  getCustomer,
  getCustomerInvoiceEligibility,
  recordManualVerification,
  reinstateCustomer,
  searchCustomers,
  suspendCustomer,
  updateCustomer,
} from "@/server/services/master-data/customers";
import { retireFormatRule, setFormatRule } from "@/server/services/master-data/identifier-rules";
import {
  createSupplier,
  getSupplier,
  searchSuppliers,
  updateSupplier,
} from "@/server/services/master-data/suppliers";
import { approveReleaseGate } from "@/server/services/release-gates";

import { appHandle, asOrg, expectSqlState, ownerSql, seedOrg, type SeededOrg } from "./helpers";

const { db, close } = appHandle();
const owner = ownerSql();

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
/** Synthetic 9-digit identifier, unique per call. */
let serial = 100_000_000;
const synthId = () => String((serial += 7919));

const customer = (overrides: Record<string, unknown> = {}) => ({
  legalName: `Ndërtimi Test ${randomUUID().slice(0, 6)} SH.P.K.`,
  identifiers: { BUSINESS_NUMBER: synthId() },
  address: "Rruga Testi 1",
  city: "Prishtinë",
  ...overrides,
});

async function evidenceDocument(orgId: string, uploadedBy: string) {
  const [row] = await owner<{ id: string }[]>`
    insert into app.document_files (org_id, storage_bucket, object_path, sha256, mime, size_bytes, uploaded_by)
    values (${orgId}, 'synthetic-test', ${`verification/${randomUUID()}.pdf`},
      ${randomUUID().replace(/-/g, "").padEnd(64, "0")}, 'application/pdf', 1024, ${uploadedBy})
    returning id`;
  return row!.id;
}

const stateOf = async (org: SeededOrg, customerId: string) =>
  (await getCustomer(db, org.director, customerId)).derived.state;

describe("customers: registered businesses only", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
  });

  it("requires a legal name and at least one business identifier", async () => {
    const error = await caught(
      createCustomer(db, org.director, { legalName: " ", identifiers: {} }, key()),
    );
    expect((error as ValidationError).fieldErrors).toEqual({
      legalName: "Shkruani të paktën 2 shenja.",
      identifiers: "Një klient biznes duhet të ketë të paktën një numër identifikues të biznesit.",
    });
    const bad = await caught(
      createCustomer(
        db,
        org.director,
        customer({ identifiers: { FISCAL_NUMBER: "12/34" } }),
        key(),
      ),
    );
    expect((bad as ValidationError).fieldErrors["identifiers.FISCAL_NUMBER"]).toBe(
      "Lejohen vetëm shifra, shkronja latine dhe vizë (deri 40).",
    );
  });

  it("creates an UNVERIFIED customer and claims no format validity without rules", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const detail = await getCustomer(db, org.director, customerId);
    expect(detail.derived.state).toBe("UNVERIFIED");
    expect(detail.verifications).toHaveLength(0);
    expect(detail.eligibility.eligible).toBe(false);
  });

  it("warns on same identifier or same legal name (legal-form suffix ignored), saves when acknowledged", async () => {
    const nui = synthId();
    const name = `Alumini Ylli ${randomUUID().slice(0, 4)}`;
    const first = await createCustomer(
      db,
      org.director,
      customer({ legalName: `${name} SH.P.K.`, identifiers: { BUSINESS_NUMBER: nui } }),
      key(),
    );
    const byId = await caught(
      createCustomer(db, org.director, customer({ identifiers: { BUSINESS_NUMBER: nui } }), key()),
    );
    expect(byId).toBeInstanceOf(DuplicateWarning);
    expect((byId as DuplicateWarning).matches).toEqual([
      expect.objectContaining({ id: first.customerId, reason: "I njëjti NUI" }),
    ]);
    const byName = await caught(
      createCustomer(
        db,
        org.director,
        customer({ legalName: `${name.toLowerCase()} shpk` }),
        key(),
      ),
    );
    expect((byName as DuplicateWarning).matches[0]).toMatchObject({
      id: first.customerId,
      reason: "Emër ligjor i njëjtë",
    });
    const saved = await createCustomer(
      db,
      org.director,
      customer({
        identifiers: { BUSINESS_NUMBER: nui },
        acknowledgedDuplicateIds: [first.customerId],
      }),
      key(),
    );
    const [audit] = await owner<{ safe_details: { duplicatesAcknowledged: number } }[]>`
      select safe_details from app.audit_events where entity_id = ${saved.customerId}`;
    expect(audit!.safe_details.duplicatesAcknowledged).toBe(1);
  });

  it("never writes identifier values into the audit log", async () => {
    const nui = synthId();
    const { customerId } = await createCustomer(
      db,
      org.director,
      customer({ identifiers: { BUSINESS_NUMBER: nui } }),
      key(),
    );
    const rows = await owner<{ safe_details: unknown }[]>`
      select safe_details from app.audit_events where entity_id = ${customerId}`;
    expect(JSON.stringify(rows)).not.toContain(nui);
  });

  it("finds customers by name without ë/ç and by identifier prefix", async () => {
    const nui = synthId();
    await createCustomer(
      db,
      org.director,
      customer({
        legalName: "Çatia e Gjelbër Test SH.P.K.",
        identifiers: { BUSINESS_NUMBER: nui },
      }),
      key(),
    );
    expect((await searchCustomers(db, org.director, { q: "catia e gjelber" }))[0]!.legalName).toBe(
      "Çatia e Gjelbër Test SH.P.K.",
    );
    expect(
      (await searchCustomers(db, org.director, { q: nui.slice(0, 6) })).length,
    ).toBeGreaterThan(0);
    expect(await searchCustomers(db, org.director, { q: "%" })).toEqual([]);
  });
});

describe("customers: identifier format rules (OLD-14, P-15)", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
  });

  it("only the ACCOUNTANT defines rules, in the service and in the database", async () => {
    const rule = {
      identifierType: "FISCAL_NUMBER" as const,
      required: true,
      digitsOnly: true,
      minLength: 9,
      maxLength: 9,
      sourceNote: "Shembull sintetik për testim, jo rregull ligjor",
    };
    const denied = await caught(setFormatRule(db, org.director, rule, key()));
    expect((denied as AuthorizationError).code).toBe("FORBIDDEN");
    await expectSqlState(
      asOrg(db, org.orgId, (tx) =>
        tx.execute(sql`insert into app.identifier_format_rules
          (org_id, identifier_type, min_length, max_length, source_note, created_by)
          values (${org.orgId}, 'VAT_NUMBER', 1, 2, 'x', ${org.director.userId})`),
      ),
      "42501",
    );
    await setFormatRule(db, org.accountant, rule, key());
  });

  it("enforces required identifiers and formats, and records FORMAT_VALID only when every identifier is ruled", async () => {
    const missing = await caught(createCustomer(db, org.director, customer(), key()));
    expect((missing as ValidationError).fieldErrors["identifiers.FISCAL_NUMBER"]).toBe(
      "Ky numër kërkohet sipas rregullave të kontabilistit.",
    );
    const wrong = await caught(
      createCustomer(
        db,
        org.director,
        customer({ identifiers: { FISCAL_NUMBER: "12345" } }),
        key(),
      ),
    );
    expect((wrong as ValidationError).fieldErrors["identifiers.FISCAL_NUMBER"]).toBe(
      "Sipas rregullave të kontabilistit duhet të ketë 9 shenja.",
    );

    const ruled = await createCustomer(
      db,
      org.director,
      customer({ identifiers: { FISCAL_NUMBER: synthId() } }),
      key(),
    );
    expect(await stateOf(org, ruled.customerId)).toBe("FORMAT_VALID");

    const partly = await createCustomer(
      db,
      org.director,
      customer({ identifiers: { FISCAL_NUMBER: synthId(), VAT_NUMBER: "AB12" } }),
      key(),
    );
    expect(await stateOf(org, partly.customerId)).toBe("UNVERIFIED");

    const detail = await getCustomer(db, org.director, ruled.customerId);
    expect(detail.eligibility.eligible).toBe(false);
    expect(detail.eligibility.reasons.map((r) => r.code)).toContain("NOT_VERIFIED");
  });

  it("keeps retired rules immutable and only retires ACTIVE ones", async () => {
    const [rule] = await owner<{ id: string }[]>`
      select id from app.identifier_format_rules where org_id = ${org.orgId} and status = 'ACTIVE'`;
    await retireFormatRule(db, org.accountant, rule!.id, key());
    const again = await caught(retireFormatRule(db, org.accountant, rule!.id, key()));
    expect((again as DomainError).code).toBe("RULE_RETIRED");
    await expectSqlState(
      owner`update app.identifier_format_rules set status = 'ACTIVE', retired_by = null, retired_at = null where id = ${rule!.id}`,
      "55000",
    );
  });
});

describe("customers: verification states and invoice eligibility", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
  });

  it("manual verification needs a stored evidence document and a note", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const error = await caught(
      recordManualVerification(
        db,
        org.director,
        {
          customerId,
          result: "PASSED",
          evidenceDocumentId: randomUUID(),
          note: "Certifikata e biznesit",
        },
        key(),
      ),
    );
    expect((error as ValidationError).fieldErrors.evidenceDocumentId).toBe(
      "Dokumenti i dëshmisë nuk u gjet. Ngarkojeni përsëri.",
    );
    const past = await caught(
      recordManualVerification(
        db,
        org.director,
        {
          customerId,
          result: "PASSED",
          evidenceDocumentId: randomUUID(),
          note: "Certifikata e biznesit",
          validUntil: "2020-01-01",
        },
        key(),
      ),
    );
    expect((past as ValidationError).fieldErrors.validUntil).toBe(
      "Data e vlefshmërisë nuk mund të jetë në të kaluarën.",
    );
  });

  it("MANUALLY_VERIFIED is invoiceable only once VG-07 is APPROVED", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const documentId = await evidenceDocument(org.orgId, org.director.userId);
    await recordManualVerification(
      db,
      org.accountant,
      {
        customerId,
        result: "PASSED",
        evidenceDocumentId: documentId,
        note: "Certifikata e regjistrimit e kontrolluar (sintetike)",
      },
      key(),
    );
    let detail = await getCustomer(db, org.director, customerId);
    expect(detail.derived.state).toBe("MANUALLY_VERIFIED");
    expect(detail.eligibility).toMatchObject({
      eligible: false,
      reasons: [expect.objectContaining({ code: "VG07_NOT_APPROVED" })],
    });
    const [link] = await owner<{ role: string }[]>`
      select role from app.document_links where entity_id = ${customerId}`;
    expect(link!.role).toBe("VERIFICATION_EVIDENCE");

    await approveReleaseGate(db, org.accountant, { gateKey: "VG-07" }, key());
    detail = await getCustomer(db, org.director, customerId);
    expect(detail.eligibility).toEqual({ eligible: true, state: "MANUALLY_VERIFIED", reasons: [] });

    const later = await runInTransaction(db, { orgId: org.orgId }, (tx) =>
      getCustomerInvoiceEligibility(tx, customerId, { today: "2999-01-01" }),
    );
    expect(later.eligible).toBe(true);
  });

  it("an identity change invalidates the verification; a billing-address change does not", async () => {
    const input = customer();
    const { customerId } = await createCustomer(db, org.director, input, key());
    await recordManualVerification(
      db,
      org.director,
      {
        customerId,
        result: "PASSED",
        evidenceDocumentId: await evidenceDocument(org.orgId, org.director.userId),
        note: "Certifikata e regjistrimit e kontrolluar (sintetike)",
        validUntil: "2999-12-31",
      },
      key(),
    );
    const moved = await updateCustomer(
      db,
      org.director,
      { customerId, expectedVersion: 1, ...input, address: "Rruga e Re 2", active: true },
      key(),
    );
    expect(moved.identityChanged).toBe(false);
    expect(await stateOf(org, customerId)).toBe("MANUALLY_VERIFIED");
    const afterValidity = await runInTransaction(db, { orgId: org.orgId }, (tx) =>
      getCustomerInvoiceEligibility(tx, customerId, { today: "3000-01-01" }),
    );
    expect(afterValidity.reasons.map((r) => r.code)).toContain("VERIFICATION_EXPIRED");

    await updateCustomer(
      db,
      org.director,
      {
        customerId,
        expectedVersion: 2,
        ...input,
        address: "Rruga e Re 2",
        legalName: `${input.legalName} Ndryshuar`,
        active: true,
      },
      key(),
    );
    const detail = await getCustomer(db, org.director, customerId);
    expect(detail.derived).toMatchObject({ state: "UNVERIFIED", staleAfterIdentityChange: true });
    expect(detail.eligibility.reasons[0]!.message).toBe(
      "Emri ligjor ose numrat identifikues kanë ndryshuar pas verifikimit. Verifikojeni klientin përsëri.",
    );
  });

  it("suspension blocks invoicing at once; reinstatement requires a fresh verification", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const verify = () =>
      recordManualVerification(
        db,
        org.director,
        {
          customerId,
          result: "PASSED",
          evidenceDocumentId: randomUUID(),
          note: "Certifikata e regjistrimit e kontrolluar (sintetike)",
        },
        key(),
      );
    const documentId = await evidenceDocument(org.orgId, org.director.userId);
    await recordManualVerification(
      db,
      org.director,
      {
        customerId,
        result: "PASSED",
        evidenceDocumentId: documentId,
        note: "Kontroll fillestar i dokumentit",
      },
      key(),
    );
    await suspendCustomer(
      db,
      org.accountant,
      { customerId, reason: "Biznesi është çregjistruar (test)" },
      key(),
    );
    expect(await stateOf(org, customerId)).toBe("SUSPENDED");
    const twice = await caught(
      suspendCustomer(db, org.accountant, { customerId, reason: "Pezullim i dytë provë" }, key()),
    );
    expect((twice as DomainError).code).toBe("ALREADY_SUSPENDED");
    expect(((await caught(verify())) as DomainError).code).toBe("CUSTOMER_SUSPENDED");

    await reinstateCustomer(
      db,
      org.director,
      { customerId, reason: "Biznesi u riregjistrua (test)" },
      key(),
    );
    expect(await stateOf(org, customerId)).toBe("UNVERIFIED");
    await recordManualVerification(
      db,
      org.director,
      {
        customerId,
        result: "PASSED",
        evidenceDocumentId: documentId,
        note: "Kontroll pas rikthimit",
      },
      key(),
    );
    expect(await stateOf(org, customerId)).toBe("MANUALLY_VERIFIED");
  });

  it("a failed manual check makes the customer UNVERIFIED", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const documentId = await evidenceDocument(org.orgId, org.director.userId);
    for (const result of ["PASSED", "FAILED"] as const) {
      await recordManualVerification(
        db,
        org.director,
        {
          customerId,
          result,
          evidenceDocumentId: documentId,
          note: `Kontroll i dokumentit: ${result}`,
        },
        key(),
      );
    }
    expect(await stateOf(org, customerId)).toBe("UNVERIFIED");
  });

  it("a suspension waits for an in-flight issuance check holding FOR SHARE", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    const order: string[] = [];
    const issuance = runInTransaction(db, { orgId: org.orgId }, async (tx) => {
      await getCustomerInvoiceEligibility(tx, customerId, { lock: true });
      order.push("issuance-locked");
      await new Promise((resolve) => setTimeout(resolve, 300));
      order.push("issuance-commit");
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const suspension = suspendCustomer(
      db,
      org.director,
      { customerId, reason: "Pezullim gjatë lëshimit (test)" },
      key(),
    ).then(() => order.push("suspended"));
    await Promise.all([issuance, suspension]);
    expect(order).toEqual(["issuance-locked", "issuance-commit", "suspended"]);
  });

  it("can never record an 'officially verified' claim", async () => {
    const { customerId } = await createCustomer(db, org.director, customer(), key());
    await expectSqlState(
      owner`insert into app.customer_verifications (org_id, customer_id, method, result, identity_hash, verified_by)
        values (${org.orgId}, ${customerId}, 'OFFICIAL_SOURCE', 'PASSED', ${"a".repeat(64)}, ${org.director.userId})`,
      "23514",
    );
  });

  it("refuses stale customer edits and other organizations", async () => {
    const input = customer();
    const { customerId } = await createCustomer(db, org.director, input, key());
    await updateCustomer(
      db,
      org.director,
      { customerId, expectedVersion: 1, ...input, city: "Prizren", active: true },
      key(),
    );
    const stale = await caught(
      updateCustomer(
        db,
        org.accountant,
        { customerId, expectedVersion: 1, ...input, city: "Pejë", active: true },
        key(),
      ),
    );
    expect((stale as DomainError).code).toBe("STALE_VERSION");
    const stranger = await seedOrg(db);
    expect(
      ((await caught(getCustomer(db, stranger.director, customerId))) as DomainError).code,
    ).toBe("NOT_FOUND");
    const suspend = await caught(
      suspendCustomer(
        db,
        stranger.director,
        { customerId, reason: "Tentim nga organizata tjetër" },
        key(),
      ),
    );
    expect((suspend as DomainError).code).toBe("NOT_FOUND");
  });
});

describe("suppliers: Kosovo and Albania, EUR", () => {
  let org: SeededOrg;
  beforeAll(async () => {
    org = await seedOrg(db);
  });

  it("stores country, EUR currency, identifiers by country and the invoice reference note", async () => {
    const xk = await createSupplier(
      db,
      org.director,
      {
        legalName: "Furnitori Kosova Test SH.P.K.",
        country: "XK",
        identifiers: { BUSINESS_NUMBER: synthId() },
        invoiceReferenceNote: "Faturat: FAT-VVVV-NNNN",
      },
      key(),
    );
    const al = await createSupplier(
      db,
      org.accountant,
      {
        legalName: "Furnitori Shqipëri Test SHPK",
        country: "AL",
        identifiers: { NIPT: "L00000000X" },
      },
      key(),
    );
    const [row] = await owner<
      { country: string; currency: string; invoice_reference_note: string }[]
    >`
      select country, currency, invoice_reference_note from app.suppliers where id = ${xk.supplierId}`;
    expect(row).toEqual({
      country: "XK",
      currency: "EUR",
      invoice_reference_note: "Faturat: FAT-VVVV-NNNN",
    });
    expect((await getSupplier(db, org.director, al.supplierId)).supplier.identifiers).toEqual({
      NIPT: "L00000000X",
    });
  });

  it("rejects identifiers that do not belong to the country, and unknown countries", async () => {
    const wrong = await caught(
      createSupplier(
        db,
        org.director,
        { legalName: "Furnitor Gabim", country: "AL", identifiers: { BUSINESS_NUMBER: synthId() } },
        key(),
      ),
    );
    expect((wrong as ValidationError).fieldErrors).toMatchObject({
      "identifiers.BUSINESS_NUMBER": "Ky numër nuk vlen për shtetin e zgjedhur.",
      identifiers: "Shkruani të paktën një numër identifikues të furnitorit.",
    });
    const country = await caught(
      createSupplier(
        db,
        org.director,
        { legalName: "Furnitor Gabim", country: "MK" as never, identifiers: { NIPT: "X1" } },
        key(),
      ),
    );
    expect((country as ValidationError).fieldErrors.country).toBe(
      "Zgjidhni shtetin: Kosovë ose Shqipëri.",
    );
  });

  it("warns on duplicate NIPT, updates with versions, searches, and audits", async () => {
    const nipt = `M${synthId()}A`;
    const input = {
      legalName: "Profile Durrës Test SHPK",
      country: "AL" as const,
      identifiers: { NIPT: nipt },
    };
    const first = await createSupplier(db, org.director, input, key());
    const warning = await caught(
      createSupplier(db, org.director, { ...input, legalName: "Tjetër Emër Test" }, key()),
    );
    expect((warning as DuplicateWarning).matches[0]).toMatchObject({
      id: first.supplierId,
      reason: "I njëjti NIPT",
    });
    const updated = await updateSupplier(
      db,
      org.accountant,
      { supplierId: first.supplierId, expectedVersion: 1, ...input, city: "Durrës", active: true },
      key(),
    );
    expect(updated.version).toBe(2);
    const stale = await caught(
      updateSupplier(
        db,
        org.director,
        {
          supplierId: first.supplierId,
          expectedVersion: 1,
          ...input,
          city: "Tiranë",
          active: true,
        },
        key(),
      ),
    );
    expect((stale as DomainError).code).toBe("STALE_VERSION");
    expect((await searchSuppliers(db, org.director, { q: "durres" }))[0]!.id).toBe(
      first.supplierId,
    );
    const audits = await owner<{ action: string; actor_role: string }[]>`
      select action, actor_role from app.audit_events where entity_id = ${first.supplierId} order by occurred_at`;
    expect(audits).toEqual([
      { action: "supplier.create", actor_role: "DIRECTOR" },
      { action: "supplier.update", actor_role: "ACCOUNTANT" },
    ]);
  });

  it("enforces EUR in the database", async () => {
    await expectSqlState(
      owner`insert into app.suppliers (org_id, legal_name, country, currency) values (${org.orgId}, 'X SHPK', 'AL', 'ALL')`,
      "23514",
    );
  });
});

describe("name normalization parity", () => {
  it("SQL and TypeScript normalize names identically", async () => {
    const { normalizeName, normalizedSql } = await import("@/server/services/master-data/common");
    const org = await seedOrg(db);
    const samples = [
      "Alfa SH.P.K.",
      "ALFA shpk",
      "Çelësi Ëmbël L.L.C.",
      "Beta  Sh.a.",
      "Alfa Trade",
      "N.SH. Drita n.sh.",
      "  Ylli-B.I. ",
    ];
    const rows = await asOrg(db, org.orgId, (tx) =>
      Promise.all(
        samples.map(async (sample) => {
          const [row] = await tx.execute<{ n: string }>(
            sql`select ${normalizedSql(sql`${sample}::text`)} as n`,
          );
          return row!.n;
        }),
      ),
    );
    expect(rows).toEqual(samples.map(normalizeName));
  });
});
