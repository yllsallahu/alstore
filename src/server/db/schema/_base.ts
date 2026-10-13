import { sql, type SQL } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/** All business tables live in `app`, which is not exposed through the Supabase Data API. */
export const app = pgSchema("app");

export const id = () => uuid("id").primaryKey().defaultRandom();
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
export const instant = (name: string) => timestamp(name, { withTimezone: true });
/** Kosovo-local calendar date (Europe/Belgrade), never a UTC instant. */
export const localDate = (name: string) => date(name, { mode: "string" });
export const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
export const quantity = (name: string) => numeric(name, { precision: 18, scale: 3 });
export const unitPrice = (name: string) => numeric(name, { precision: 18, scale: 3 });
export const version = () => integer("version").notNull().default(1);

const literalList = (values: readonly string[]) =>
  sql.raw(`(${values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ")})`);

export const oneOfList = (values: readonly string[]) => literalList(values);

export const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in ${literalList(values)}`;

export const enumCheck = (name: string, column: AnyPgColumn, values: readonly string[]) =>
  check(name, oneOf(column, values));

export const sha256Check = (name: string, column: AnyPgColumn) =>
  check(name, sql`${column} ~ '^[0-9a-f]{64}$'`);

/** Insert-time instant under a domain-specific column name (e.g. `occurred_at`). */
export const stampedAt = (name: string) => instant(name).notNull().defaultNow();

/** Explicitly named FK for cases where the generated name would exceed PostgreSQL's 63-byte limit. */
export const fk = (name: string, column: AnyPgColumn, target: AnyPgColumn) =>
  foreignKey({ name, columns: [column], foreignColumns: [target] });

export const eurCheck = (name: string, column: AnyPgColumn) => check(name, sql`${column} = 'EUR'`);

export const currency = () => text("currency").notNull().default("EUR");

export const organizations = app.table("organizations", {
  id: id(),
  legalName: text("legal_name").notNull(),
  createdAt: createdAt(),
});

export const orgId = () =>
  uuid("org_id")
    .notNull()
    .references(() => organizations.id);
