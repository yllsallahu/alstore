import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

/** Transaction pooler compatible: no prepared statements, no session-level settings. */
export function createDb(url: string, options: { max?: number } = {}): DbHandle {
  const client = postgres(url, { max: options.max ?? 10, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

export interface TxContext {
  orgId: string;
  actorId?: string | null;
  statementTimeoutMs?: number;
}

/** DATABASE_TRANSACTION_BOUNDARIES §2.8: deadlock, serialization failure, lock timeout. */
export const RETRYABLE_SQLSTATES = new Set(["40P01", "40001", "55P03"]);
const MAX_RETRIES = 3;

export function sqlState(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "object" && "code" in current) {
      const code = (current as { code: unknown }).code;
      if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * READ COMMITTED transaction with the org/actor context and SET LOCAL timeouts applied first
 * (DATABASE_TRANSACTION_BOUNDARIES §2.3). Retries the whole callback on retryable SQLSTATEs,
 * so the callback must be safe to re-run (idempotency key claimed inside it).
 */
export async function runInTransaction<T>(
  db: Db,
  context: TxContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const statementTimeout = `${context.statementTimeoutMs ?? 15_000}ms`;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql`select
          set_config('app.org_id', ${context.orgId}, true),
          set_config('app.actor_id', ${context.actorId ?? ""}, true),
          set_config('lock_timeout', '5s', true),
          set_config('statement_timeout', ${statementTimeout}, true),
          set_config('idle_in_transaction_session_timeout', '30s', true)`);
        return fn(tx);
      });
    } catch (error) {
      const code = sqlState(error);
      if (code && RETRYABLE_SQLSTATES.has(code) && attempt < MAX_RETRIES) {
        await sleep(25 * 2 ** attempt + Math.floor(Math.random() * 25));
        continue;
      }
      throw error;
    }
  }
}
