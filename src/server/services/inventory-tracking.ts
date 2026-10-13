import { sql } from "drizzle-orm";

import type { Tx } from "@/server/db/client";
import { DomainError } from "@/server/errors";

export type TrackingStatus = "KNOWN" | "UNKNOWN";

/** INV-08. Derived by the database function app.stock_tracking_status; never stored. */
export async function getStockTrackingStatuses(
  tx: Tx,
  productIds: readonly string[],
): Promise<Map<string, TrackingStatus>> {
  const result = new Map<string, TrackingStatus>();
  if (productIds.length === 0) return result;
  const rows = await tx.execute<{ id: string; status: TrackingStatus }>(
    sql`select p.id, app.stock_tracking_status(p.id) as status
        from app.products p
        where p.id in (${sql.join(
          productIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`,
  );
  for (const row of rows) result.set(row.id, row.status);
  return result;
}

export const unknownStockError = (skus: string[]) =>
  new DomainError(
    "STOCK_STATUS_UNKNOWN",
    `Gjendja fillestare e këtyre produkteve nuk është verifikuar fizikisht, ndaj nuk mund të shiten: ${skus.join(", ")}.`,
    409,
  );

/** Used by sale / receipt commands (later phases) before any stock-affecting write. */
export async function assertProductsTradable(tx: Tx, productIds: readonly string[]): Promise<void> {
  const statuses = await getStockTrackingStatuses(tx, productIds);
  const unknown = productIds.filter((id) => statuses.get(id) !== "KNOWN");
  if (unknown.length === 0) return;
  const rows = await tx.execute<{ sku: string }>(
    sql`select sku from app.products where id in (${sql.join(
      unknown.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}) order by sku`,
  );
  throw unknownStockError(rows.map((row) => row.sku));
}
