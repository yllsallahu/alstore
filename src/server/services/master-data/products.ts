import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  productCreateSchema,
  productUpdateSchema,
  searchSchema,
  unitChangeDecisionSchema,
  unitChangeRequestSchema,
} from "@/lib/validation/master-data";
import { formatDecimal } from "@/lib/decimal";
import { UNIT_LABELS } from "@/lib/master-data-labels";
import { assertActorActive } from "@/server/auth/actor";
import { assertFourEyes, authorize, type Actor } from "@/server/auth/permissions";
import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db, type Tx } from "@/server/db/client";
import {
  approvals,
  auditEvents,
  productUnitChanges,
  products,
  stockBalances,
} from "@/server/db/schema";
import {
  DomainError,
  ValidationError,
  notFound,
  staleVersion,
  type DuplicateMatch,
} from "@/server/errors";
import { claimIdempotencyKey, completeIdempotencyKey } from "@/server/idempotency/idempotency";
import { requestHash, sha256Hex, canonicalJson } from "@/server/lib/canonical-hash";

import {
  assertDuplicatesAcknowledged,
  changedFields,
  isUniqueViolation,
  likeEscape,
  mergeMatches,
  normalizeName,
  normalizedSql,
  parseOrThrow,
} from "./common";

type Replayable<T> = T & { replayed: boolean };

const ENTITY = "product";

export const skuTaken = () =>
  new DomainError("SKU_TAKEN", "Kjo SKU ekziston tashmë. Çdo SKU duhet të jetë unike.", 409);
const barcodeTaken = () =>
  new DomainError("BARCODE_TAKEN", "Ky barkod i përket tashmë një produkti tjetër.", 409);

const compactSku = (sku: string) => sku.replace(/[./_-]/g, "");

export const productHash = (row: Record<string, unknown>) =>
  sha256Hex(
    canonicalJson({
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      barcode: row.barcode,
      referencePurchasePrice: row.referencePurchasePrice,
      active: row.active,
    }),
  );

/** Same display name, or a SKU that differs only by separators ("AL-01" vs "AL01"). */
async function findProductDuplicates(
  tx: Tx,
  input: { sku: string; name: string },
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const nameKey = normalizeName(input.name);
  const rows = await tx
    .select({ id: products.id, sku: products.sku, name: products.name })
    .from(products)
    .where(
      and(
        excludeId ? ne(products.id, excludeId) : undefined,
        or(
          sql`${normalizedSql(products.name)} = ${nameKey}`,
          sql`regexp_replace(${products.sku}, '[./_-]', '', 'g') = ${compactSku(input.sku)}`,
        ),
      ),
    )
    .limit(10);
  return mergeMatches(
    rows.map((row) => ({
      id: row.id,
      label: `${row.sku} — ${row.name}`,
      reason:
        normalizeName(row.name) === nameKey
          ? "Emër i njëjtë me një produkt tjetër"
          : "SKU shumë e ngjashme (ndryshon vetëm nga shenjat ndarëse)",
    })),
  );
}

async function assertBarcodeFree(tx: Tx, barcode: string | null, excludeId?: string) {
  if (!barcode) return;
  const [row] = await tx
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.barcode, barcode), excludeId ? ne(products.id, excludeId) : undefined));
  if (row) throw barcodeTaken();
}

async function hasStockMovements(tx: Tx, productId: string) {
  const rows = await tx.execute<{ exists: boolean }>(
    sql`select (exists (select 1 from app.stock_movements where product_id = ${productId}) or exists (select 1 from app.opening_stock_lines where product_id = ${productId})) as exists`,
  );
  return rows[0]?.exists === true;
}

/** P-10. SKU unique and immutable; duplicate display names allowed after acknowledgement. */
export async function createProduct(
  db: Db,
  actor: Actor,
  raw: z.input<typeof productCreateSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ productId: string }>> {
  authorize(actor, "P-10");
  const input = parseOrThrow(productCreateSchema, raw);

  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "product.create",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") return { productId: claim.resultId!, replayed: true };
      await assertActorActive(tx, actor);

      const [existing] = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, input.sku));
      if (existing) throw skuTaken();
      await assertBarcodeFree(tx, input.barcode);
      assertDuplicatesAcknowledged(
        await findProductDuplicates(tx, input),
        input.acknowledgedDuplicateIds,
      );

      const values = {
        sku: input.sku,
        name: input.name,
        category: input.category,
        unit: input.unit,
        barcode: input.barcode,
        referencePurchasePrice: input.referencePurchasePrice,
        active: input.active,
      };
      const [row] = await tx
        .insert(products)
        .values({ orgId: actor.orgId, ...values })
        .returning({ id: products.id });
      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "product.create",
        entityType: ENTITY,
        entityId: row!.id,
        idempotencyKey,
        afterHash: productHash(values),
        details: {
          sku: input.sku,
          unit: input.unit,
          category: input.category,
          duplicatesAcknowledged: input.acknowledgedDuplicateIds.length,
        },
      });
      await completeIdempotencyKey(tx, claim.id, { resultType: "PRODUCT", resultId: row!.id });
      return { productId: row!.id, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_sku_uq")) throw skuTaken();
    if (isUniqueViolation(error, "products_barcode_uq")) throw barcodeTaken();
    throw error;
  }
}

/**
 * P-10. Optimistic version check (two tabs, two users). The unit changes here only while the
 * product has no stock movements; afterwards the approved unit-migration path is required.
 */
export async function updateProduct(
  db: Db,
  actor: Actor,
  raw: z.input<typeof productUpdateSchema> & { sku?: unknown },
  idempotencyKey: string,
): Promise<Replayable<{ productId: string; version: number }>> {
  authorize(actor, "P-10");
  if (raw && typeof raw === "object" && "sku" in raw) {
    throw new DomainError("SKU_IMMUTABLE", "SKU nuk mund të ndryshohet pas krijimit.", 422);
  }
  const input = parseOrThrow(productUpdateSchema, raw);

  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "product.update",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") {
        const [row] = await tx
          .select({ version: products.version })
          .from(products)
          .where(eq(products.id, input.productId));
        return { productId: input.productId, version: row?.version ?? 0, replayed: true };
      }
      await assertActorActive(tx, actor);

      const [current] = await tx
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .for("update");
      if (!current) throw notFound();
      if (current.version !== input.expectedVersion) throw staleVersion();

      const next = {
        name: input.name,
        category: input.category,
        unit: input.unit,
        barcode: input.barcode,
        referencePurchasePrice: input.referencePurchasePrice,
        active: input.active,
      };
      const changed = changedFields(current, next);
      if (changed.length === 0) {
        throw new DomainError("NO_CHANGES", "Nuk ka ndryshime për t'u ruajtur.", 422);
      }
      if (changed.includes("unit") && (await hasStockMovements(tx, current.id))) {
        throw new DomainError(
          "UNIT_LOCKED",
          "Njësia nuk mund të ndryshohet sepse produkti ka lëvizje stoku. Përdorni kërkesën për migrim të njësisë, e cila kërkon miratimin e përdoruesit tjetër.",
          409,
        );
      }
      if (changed.includes("barcode")) await assertBarcodeFree(tx, next.barcode, current.id);
      if (changed.includes("name")) {
        assertDuplicatesAcknowledged(
          (
            await findProductDuplicates(tx, { sku: current.sku, name: next.name }, current.id)
          ).filter((match) => match.reason.startsWith("Emër")),
          input.acknowledgedDuplicateIds,
        );
      }

      const [updated] = await tx
        .update(products)
        .set({ ...next, version: sql`${products.version} + 1`, updatedAt: sql`now()` })
        .where(and(eq(products.id, current.id), eq(products.version, input.expectedVersion)))
        .returning({ version: products.version });
      if (!updated) throw staleVersion();

      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "product.update",
        entityType: ENTITY,
        entityId: current.id,
        idempotencyKey,
        beforeHash: productHash(current),
        afterHash: productHash({ ...current, ...next }),
        details: {
          sku: current.sku,
          changed,
          ...(changed.includes("unit") ? { unitFrom: current.unit, unitTo: next.unit } : {}),
          ...(changed.includes("active") ? { active: next.active } : {}),
        },
      });
      await completeIdempotencyKey(tx, claim.id, { resultType: "PRODUCT", resultId: current.id });
      return { productId: current.id, version: updated.version, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_barcode_uq")) throw barcodeTaken();
    throw error;
  }
}

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  barcode: string | null;
  referencePurchasePrice: string | null;
  active: boolean;
}

/**
 * P-16. Fast SKU-first search: exact SKU, then SKU prefix (index on sku text_pattern_ops), then
 * SKU or name contains (ë/ç-insensitive), and exact barcode. ≤ 100 rows.
 */
export async function searchProducts(
  db: Db,
  actor: Actor,
  raw: z.input<typeof searchSchema>,
): Promise<ProductListItem[]> {
  authorize(actor, "P-16");
  const input = parseOrThrow(searchSchema, raw);
  const upper = input.q.toUpperCase();
  const pattern = `%${likeEscape(upper)}%`;
  const prefix = `${likeEscape(upper)}%`;
  const normalized = normalizeName(input.q);
  const nameKey = `%${likeEscape(normalized)}%`;

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, (tx) =>
    tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        category: products.category,
        unit: products.unit,
        barcode: products.barcode,
        referencePurchasePrice: products.referencePurchasePrice,
        active: products.active,
      })
      .from(products)
      .where(
        and(
          input.includeInactive ? undefined : eq(products.active, true),
          input.q === ""
            ? undefined
            : or(
                sql`${products.sku} like ${prefix}`,
                sql`${products.sku} like ${pattern}`,
                normalized ? sql`${normalizedSql(products.name)} like ${nameKey}` : undefined,
                eq(products.barcode, upper),
              ),
        ),
      )
      .orderBy(
        sql`case when ${products.sku} = ${upper} then 0 when ${products.sku} like ${prefix} then 1 else 2 end`,
        products.sku,
      )
      .limit(input.limit),
  );
}

export async function getProduct(db: Db, actor: Actor, productId: string) {
  authorize(actor, "P-16");
  if (!z.uuid().safeParse(productId).success) throw notFound();
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId));
    if (!product) throw notFound();
    const unitLocked = await hasStockMovements(tx, productId);
    const unitChanges = await tx
      .select()
      .from(productUnitChanges)
      .where(eq(productUnitChanges.productId, productId))
      .orderBy(desc(productUnitChanges.requestedAt));
    const history = await tx
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        action: auditEvents.action,
        actorRole: auditEvents.actorRole,
        details: auditEvents.safeDetails,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, ENTITY), eq(auditEvents.entityId, productId)))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(30);
    return { product, unitLocked, unitChanges, history };
  });
}

/** P-10. Requests the INV-05 exception for a product that already has stock movements. */
export async function requestUnitChange(
  db: Db,
  actor: Actor,
  raw: z.input<typeof unitChangeRequestSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ changeId: string }>> {
  authorize(actor, "P-10");
  const input = parseOrThrow(unitChangeRequestSchema, raw);

  try {
    return await runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
      const claim = await claimIdempotencyKey(tx, {
        orgId: actor.orgId,
        actorId: actor.userId,
        key: idempotencyKey,
        operation: "product.unit_change.request",
        requestHash: requestHash(input),
      });
      if (claim.kind === "REPLAY") return { changeId: claim.resultId!, replayed: true };
      await assertActorActive(tx, actor);

      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .for("update");
      if (!product) throw notFound();
      if (product.unit === input.toUnit) {
        throw new ValidationError({ toUnit: "Zgjidhni një njësi tjetër nga ajo aktuale." });
      }
      if (!(await hasStockMovements(tx, product.id))) {
        throw new DomainError(
          "UNIT_CHANGE_NOT_NEEDED",
          "Produkti nuk ka lëvizje stoku: njësia ndryshohet direkt te forma e produktit.",
          409,
        );
      }
      const [row] = await tx
        .insert(productUnitChanges)
        .values({
          orgId: actor.orgId,
          productId: product.id,
          fromUnit: product.unit,
          toUnit: input.toUnit,
          reason: input.reason,
          requestedBy: actor.userId,
        })
        .returning({ id: productUnitChanges.id });
      await writeAudit(tx, {
        orgId: actor.orgId,
        actor,
        action: "product.unit_change.request",
        entityType: ENTITY,
        entityId: product.id,
        idempotencyKey,
        details: { sku: product.sku, changeId: row!.id, from: product.unit, to: input.toUnit },
      });
      await completeIdempotencyKey(tx, claim.id, {
        resultType: "PRODUCT_UNIT_CHANGE",
        resultId: row!.id,
      });
      return { changeId: row!.id, replayed: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "product_unit_changes_one_pending_uq")) {
      throw new DomainError(
        "UNIT_CHANGE_PENDING",
        "Ekziston tashmë një kërkesë në pritje për njësinë e këtij produkti.",
        409,
      );
    }
    throw error;
  }
}

/** Open draft documents that copy the product's unit and would be left inconsistent. */
async function draftReferences(tx: Tx, productId: string): Promise<string[]> {
  const rows = await tx.execute<{ kind: string }>(sql`
    select 'Shitje draft' as kind from app.sale_lines l join app.sales s on s.id = l.sale_id
      where l.product_id = ${productId} and s.status = 'DRAFT'
    union all
    select 'Pranim malli i pa postuar' from app.goods_receipt_lines l
      join app.goods_receipts r on r.id = l.receipt_id
      where l.product_id = ${productId} and r.status in ('DRAFT', 'DISCREPANCY_HOLD')
    union all
    select 'Faturë blerjeje draft' from app.purchase_invoice_lines l
      join app.purchase_invoices p on p.id = l.invoice_id
      where l.product_id = ${productId} and p.status = 'DRAFT'
    union all
    select 'Numërim fillestar i pa postuar' from app.opening_stock_lines l
      join app.opening_stock_batches b on b.id = l.batch_id
      where l.product_id = ${productId} and b.status <> 'POSTED'
    union all
    select 'Rregullim stoku në pritje' from app.inventory_adjustments a
      where a.product_id = ${productId} and a.status in ('DRAFT', 'PENDING_APPROVAL')`);
  return [...new Set(rows.map((row) => row.kind))];
}

/**
 * P-14 (approve / reject, four-eyes) or P-10 (cancel by the requester). Approval applies the
 * new unit in the same transaction, only at zero on-hand stock and with no open drafts; the
 * database trigger re-checks both conditions.
 */
export async function decideUnitChange(
  db: Db,
  actor: Actor,
  raw: z.input<typeof unitChangeDecisionSchema>,
  idempotencyKey: string,
): Promise<Replayable<{ changeId: string; status: string }>> {
  const input = parseOrThrow(unitChangeDecisionSchema, raw);
  authorize(actor, input.decision === "CANCEL" ? "P-10" : "P-14");

  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, async (tx) => {
    const claim = await claimIdempotencyKey(tx, {
      orgId: actor.orgId,
      actorId: actor.userId,
      key: idempotencyKey,
      operation: "product.unit_change.decide",
      requestHash: requestHash(input),
    });
    if (claim.kind === "REPLAY") {
      const [row] = await tx
        .select({ status: productUnitChanges.status })
        .from(productUnitChanges)
        .where(eq(productUnitChanges.id, input.changeId));
      return { changeId: input.changeId, status: row?.status ?? "", replayed: true };
    }
    await assertActorActive(tx, actor);

    const [change] = await tx
      .select()
      .from(productUnitChanges)
      .where(eq(productUnitChanges.id, input.changeId))
      .for("update");
    if (!change) throw notFound();
    if (change.status !== "PENDING_APPROVAL") {
      throw new DomainError("UNIT_CHANGE_DECIDED", "Kjo kërkesë është vendosur tashmë.", 409);
    }

    if (input.decision === "CANCEL") {
      if (change.requestedBy !== actor.userId) {
        throw new DomainError(
          "NOT_REQUESTER",
          "Vetëm përdoruesi që e bëri kërkesën mund ta anulojë.",
          403,
        );
      }
    } else {
      assertFourEyes(actor, change.requestedBy, "P-14");
    }

    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, change.productId))
      .for("update");
    if (!product) throw notFound();

    let approvalId: string | null = null;
    if (input.decision === "APPROVE") {
      if (product.unit !== change.fromUnit) {
        throw new DomainError(
          "UNIT_CHANGED_MEANWHILE",
          "Njësia e produktit ka ndryshuar pas kërkesës. Refuzojeni këtë kërkesë dhe krijoni një të re.",
          409,
        );
      }
      const [balance] = await tx
        .select({ onHand: stockBalances.onHand })
        .from(stockBalances)
        .where(eq(stockBalances.productId, product.id))
        .for("update");
      if (!balance || !/^0(\.0+)?$/.test(balance.onHand)) {
        throw new DomainError(
          "UNIT_CHANGE_STOCK_NOT_ZERO",
          `Njësia mund të ndryshohet vetëm kur gjendja e stokut është 0,000. Gjendja aktuale: ${formatDecimal(balance?.onHand, 3)} ${UNIT_LABELS[product.unit as keyof typeof UNIT_LABELS]}. Nuk bëhet asnjë konvertim sasie.`,
          409,
        );
      }
      const drafts = await draftReferences(tx, product.id);
      if (drafts.length > 0) {
        throw new DomainError(
          "UNIT_CHANGE_OPEN_DRAFTS",
          `Produkti përdoret në dokumente të hapura: ${drafts.join(", ")}. Mbyllini ose hiqeni produktin prej tyre para ndryshimit të njësisë.`,
          409,
        );
      }
    }

    if (input.decision !== "CANCEL") {
      const [approval] = await tx
        .insert(approvals)
        .values({
          orgId: actor.orgId,
          subjectType: "PRODUCT_UNIT_CHANGE",
          subjectId: change.id,
          approvalKind: "UNIT_MIGRATION",
          actorId: actor.userId,
          actorRole: actor.role,
          requesterId: change.requestedBy,
          requiresFourEyes: true,
          decision: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
          comment: input.comment,
        })
        .returning({ id: approvals.id });
      approvalId = approval!.id;
    }

    const status =
      input.decision === "APPROVE"
        ? "APPROVED_APPLIED"
        : input.decision === "REJECT"
          ? "REJECTED"
          : "CANCELLED";
    await tx
      .update(productUnitChanges)
      .set({
        status,
        decidedBy: actor.userId,
        decidedAt: sql`now()`,
        decisionComment: input.comment,
        approvalId,
      })
      .where(eq(productUnitChanges.id, change.id));

    if (input.decision === "APPROVE") {
      // The products trigger accepts the unit change only for this approved, same-transaction id.
      await tx.execute(sql`select set_config('app.unit_change_id', ${change.id}, true)`);
      await tx
        .update(products)
        .set({ unit: change.toUnit, version: sql`${products.version} + 1`, updatedAt: sql`now()` })
        .where(eq(products.id, product.id));
    }

    await writeAudit(tx, {
      orgId: actor.orgId,
      actor,
      action: `product.unit_change.${input.decision.toLowerCase()}`,
      entityType: ENTITY,
      entityId: product.id,
      idempotencyKey,
      details: {
        sku: product.sku,
        changeId: change.id,
        from: change.fromUnit,
        to: change.toUnit,
        status,
      },
    });
    await completeIdempotencyKey(tx, claim.id, {
      resultType: "PRODUCT_UNIT_CHANGE",
      resultId: change.id,
    });
    return { changeId: change.id, status, replayed: false };
  });
}

/** Pending unit-migration requests, for the approval list. */
export async function listPendingUnitChanges(db: Db, actor: Actor) {
  authorize(actor, "P-16");
  return runInTransaction(db, { orgId: actor.orgId, actorId: actor.userId }, (tx) =>
    tx
      .select({
        id: productUnitChanges.id,
        productId: productUnitChanges.productId,
        sku: products.sku,
        name: products.name,
        fromUnit: productUnitChanges.fromUnit,
        toUnit: productUnitChanges.toUnit,
        reason: productUnitChanges.reason,
        requestedBy: productUnitChanges.requestedBy,
        requestedAt: productUnitChanges.requestedAt,
      })
      .from(productUnitChanges)
      .innerJoin(products, eq(products.id, productUnitChanges.productId))
      .where(inArray(productUnitChanges.status, ["PENDING_APPROVAL"]))
      .orderBy(productUnitChanges.requestedAt),
  );
}
