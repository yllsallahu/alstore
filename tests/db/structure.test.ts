import { afterAll, describe, expect, it } from "vitest";

import { ownerSql } from "./helpers";

const owner = ownerSql();
afterAll(() => owner.end());

const APPEND_ONLY = [
  "audit_events",
  "stock_events",
  "stock_movements",
  "tax_invoices",
  "tax_invoice_lines",
  "fulfillments",
  "fulfillment_lines",
  "tax_snapshots",
  "tax_period_snapshots",
  "payments",
  "payment_allocations",
  "customer_refund_liabilities",
  "refunds",
  "customer_verifications",
  "invoice_pdf_renders",
  "book_lines",
  "exports",
  "edi_filing_receipts",
];
const DELETABLE = [
  "sale_lines",
  "purchase_invoice_lines",
  "goods_receipt_lines",
  "correction_document_lines",
  "opening_stock_lines",
  "fulfillment_correction_lines",
  "document_links",
  "import_declaration_links",
];

async function appTables(): Promise<string[]> {
  const rows = await owner<{ relname: string }[]>`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relkind = 'r' order by 1`;
  return rows.map((row) => row.relname);
}

describe("schema structure", () => {
  it("creates every domain table in schema app", async () => {
    const tables = await appTables();
    expect(tables).toHaveLength(60);
    expect(tables).toEqual(expect.arrayContaining(["organizations", ...APPEND_ONLY, ...DELETABLE]));
  });

  it("enables RLS with an org_isolation policy on every table", async () => {
    const rows = await owner<{ relname: string; rls: boolean; policies: number }[]>`
      select c.relname, c.relrowsecurity as rls,
        (select count(*)::int from pg_policies p
          where p.schemaname = 'app' and p.tablename = c.relname and p.policyname = 'org_isolation') as policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relkind = 'r'`;
    expect(rows).toHaveLength(60);
    for (const row of rows) {
      expect(row, row.relname).toMatchObject({ rls: true, policies: 1 });
    }
  });

  it("grants alstore_app least privilege", async () => {
    for (const table of await appTables()) {
      const [privileges] = await owner<
        { sel: boolean; ins: boolean; upd: boolean; del: boolean; trunc: boolean }[]
      >`
        select has_table_privilege('alstore_app', ${`app.${table}`}, 'SELECT') as sel,
          has_table_privilege('alstore_app', ${`app.${table}`}, 'INSERT') as ins,
          has_table_privilege('alstore_app', ${`app.${table}`}, 'UPDATE') as upd,
          has_table_privilege('alstore_app', ${`app.${table}`}, 'DELETE') as del,
          has_table_privilege('alstore_app', ${`app.${table}`}, 'TRUNCATE') as trunc`;
      expect(privileges, table).toMatchObject({
        sel: true,
        ins: true,
        upd: !APPEND_ONLY.includes(table),
        del: DELETABLE.includes(table),
        trunc: false,
      });
    }
  });

  it("gives the read-only role SELECT only", async () => {
    const rows = await owner<{ table_name: string; privilege_type: string }[]>`
      select table_name, privilege_type from information_schema.role_table_grants
      where grantee = 'alstore_readonly' and table_schema = 'app' and privilege_type <> 'SELECT'`;
    expect(rows).toEqual([]);
  });

  it("does not let PUBLIC use the schema, tables or functions", async () => {
    const [row] = await owner<{ schema: boolean; resolve: boolean; readonlyResolve: boolean }[]>`
      select has_schema_privilege('public', 'app', 'USAGE') as schema,
        has_function_privilege('public', 'app.resolve_actor(uuid)', 'EXECUTE') as resolve,
        has_function_privilege('alstore_readonly', 'app.resolve_actor(uuid)', 'EXECUTE') as "readonlyResolve"`;
    expect(row).toEqual({ schema: false, resolve: false, readonlyResolve: false });
    const grants = await owner`
      select 1 from information_schema.role_table_grants
      where grantee = 'PUBLIC' and table_schema = 'app'`;
    expect(grants).toHaveLength(0);
  });

  it("keeps the runtime roles non-superuser without BYPASSRLS", async () => {
    const rows = await owner<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolname, rolsuper, rolbypassrls from pg_roles
      where rolname in ('alstore_app', 'alstore_readonly', 'alstore_migrator')`;
    expect(rows).toHaveLength(3);
    for (const role of rows) expect(role).toMatchObject({ rolsuper: false, rolbypassrls: false });
  });
});
