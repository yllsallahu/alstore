import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuditHistory } from "@/components/master-data/audit-history";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { ProductForm } from "@/components/master-data/product-form";
import { SavedNotice } from "@/components/master-data/saved-notice";
import {
  UnitChangeDecisionForm,
  UnitChangeRequestForm,
} from "@/components/master-data/unit-change-panel";
import { Unavailable } from "@/components/master-data/unavailable";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatInstant } from "@/lib/dates";
import { decimalToInput } from "@/lib/decimal";
import { UNIT_CHANGE_STATUS_LABELS, UNIT_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getProduct } from "@/server/services/master-data/products";

import { decideUnitChangeAction, requestUnitChangeAction, updateProductAction } from "../actions";

export const metadata: Metadata = { title: "Produkti" };

const unitLabel = (code: string) => UNIT_LABELS[code as keyof typeof UNIT_LABELS] ?? code;

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const saved = (await searchParams).ruajtur;
  const ctx = await getRequestContext();
  const crumbs = [
    { href: "/stoku", label: "Stoku" },
    { href: "/stoku/produktet", label: "Produktet" },
  ];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Produkti" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }

  let data;
  try {
    data = await getProduct(ctx.db, ctx.actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { product, unitLocked, unitChanges, history } = data;
  const pending = unitChanges.find((change) => change.status === "PENDING_APPROVAL");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={<span className="font-mono">{product.sku}</span>}
        description={product.name}
        crumbs={crumbs}
        badges={
          <>
            <StatusBadge tone="info">{unitLabel(product.unit)}</StatusBadge>
            {product.active ? (
              <StatusBadge tone="success">Aktiv</StatusBadge>
            ) : (
              <StatusBadge>Jo aktiv</StatusBadge>
            )}
          </>
        }
      />
      <SavedNotice code={typeof saved === "string" ? saved : undefined} />

      <Section title="Të dhënat e produktit" description="Fushat me * janë të detyrueshme.">
        <ProductForm
          key={product.version}
          mode="edit"
          action={updateProductAction}
          idempotencyKey={randomUUID()}
          productId={product.id}
          version={product.version}
          unitLocked={unitLocked}
          cancelHref="/stoku/produktet"
          defaults={{
            sku: product.sku,
            name: product.name,
            category: product.category,
            unit: product.unit,
            barcode: product.barcode ?? "",
            referencePurchasePrice: decimalToInput(product.referencePurchasePrice),
            active: product.active,
          }}
        />
      </Section>

      {unitLocked && (
        <Section
          id="njesia"
          title="Ndryshimi i njësisë (migrim i miratuar)"
          description="Produkti ka lëvizje stoku, prandaj njësia nuk ndryshohet drejtpërdrejt. Një kërkesë me arsye duhet të miratohet nga përdoruesi tjetër."
        >
          {pending ? (
            <div className="flex flex-col gap-4">
              <div className="border-line bg-canvas rounded-md border p-4 text-sm">
                <p className="font-medium">
                  {unitLabel(pending.fromUnit)} → {unitLabel(pending.toUnit)} ·{" "}
                  {UNIT_CHANGE_STATUS_LABELS.PENDING_APPROVAL}
                </p>
                <p className="mt-1">{pending.reason}</p>
                <p className="text-ink-muted mt-1">
                  Kërkuar më {formatInstant(pending.requestedAt)}
                </p>
              </div>
              <UnitChangeDecisionForm
                key={pending.id}
                action={decideUnitChangeAction}
                productId={product.id}
                changeId={pending.id}
                idempotencyKey={randomUUID()}
                isRequester={pending.requestedBy === ctx.actor.userId}
              />
            </div>
          ) : (
            <UnitChangeRequestForm
              key={`${product.unit}-${unitChanges.length}`}
              action={requestUnitChangeAction}
              productId={product.id}
              currentUnit={product.unit}
              idempotencyKey={randomUUID()}
            />
          )}
          {unitChanges.some((change) => change.status !== "PENDING_APPROVAL") && (
            <ul className="divide-line mt-4 divide-y text-sm">
              {unitChanges
                .filter((change) => change.status !== "PENDING_APPROVAL")
                .map((change) => (
                  <li key={change.id} className="py-2">
                    {unitLabel(change.fromUnit)} → {unitLabel(change.toUnit)} ·{" "}
                    {
                      UNIT_CHANGE_STATUS_LABELS[
                        change.status as keyof typeof UNIT_CHANGE_STATUS_LABELS
                      ]
                    }{" "}
                    · {formatInstant(change.decidedAt)}
                  </li>
                ))}
            </ul>
          )}
        </Section>
      )}

      <Section
        title="Historiku i ndryshimeve"
        description="Çdo ndryshim regjistrohet me përdoruesin dhe kohën."
      >
        <AuditHistory items={history} />
      </Section>
    </div>
  );
}
