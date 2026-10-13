import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuditHistory } from "@/components/master-data/audit-history";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { SupplierForm } from "@/components/master-data/supplier-form";
import { Unavailable } from "@/components/master-data/unavailable";
import { StatusBadge } from "@/components/ui/status-badge";
import { COUNTRY_LABELS } from "@/lib/master-data-labels";
import { getRequestContext } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getSupplier } from "@/server/services/master-data/suppliers";

import { updateSupplierAction } from "../actions";

export const metadata: Metadata = { title: "Furnitori" };

export default async function SupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const saved = (await searchParams).ruajtur;
  const ctx = await getRequestContext();
  const crumbs = [{ href: "/furnitoret", label: "Furnitorët" }];
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Furnitori" crumbs={crumbs} />
        <Unavailable context={ctx} />
      </div>
    );
  }
  let data;
  try {
    data = await getSupplier(ctx.db, ctx.actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { supplier, history } = data;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={supplier.legalName}
        crumbs={crumbs}
        badges={
          <>
            <StatusBadge tone="info">
              {COUNTRY_LABELS[supplier.country as keyof typeof COUNTRY_LABELS]} · EUR
            </StatusBadge>
            {!supplier.active && <StatusBadge>Jo aktiv</StatusBadge>}
          </>
        }
      />
      <SavedNotice code={typeof saved === "string" ? saved : undefined} />
      <Section title="Të dhënat e furnitorit" description="Fushat me * janë të detyrueshme.">
        <SupplierForm
          key={supplier.version}
          mode="edit"
          action={updateSupplierAction}
          idempotencyKey={randomUUID()}
          supplierId={supplier.id}
          version={supplier.version}
          cancelHref="/furnitoret"
          defaults={{
            legalName: supplier.legalName,
            country: supplier.country,
            identifiers: supplier.identifiers,
            address: supplier.address ?? "",
            city: supplier.city ?? "",
            invoiceReferenceNote: supplier.invoiceReferenceNote ?? "",
            active: supplier.active,
          }}
        />
      </Section>
      <Section
        title="Faturat e furnitorit"
        description="Faturat e blerjes dhe DUD-et lidhen me furnitorin në fazën 10 (Blerje e re)."
      >
        <p className="text-ink-muted text-sm">
          Nuk ka ende fatura të regjistruara për këtë furnitor.
        </p>
      </Section>
      <Section title="Historiku i ndryshimeve">
        <AuditHistory items={history} />
      </Section>
    </div>
  );
}
