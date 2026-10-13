import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/master-data/page-header";
import { SupplierForm } from "@/components/master-data/supplier-form";
import { Unavailable } from "@/components/master-data/unavailable";
import { getRequestContext } from "@/server/auth/session";

import { createSupplierAction } from "../actions";

export const metadata: Metadata = { title: "Furnitor i ri" };

export default async function NewSupplierPage() {
  const ctx = await getRequestContext();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Furnitor i ri" crumbs={[{ href: "/furnitoret", label: "Furnitorët" }]} />
      {ctx.kind !== "ready" ? (
        <Unavailable context={ctx} />
      ) : (
        <Section title="Të dhënat e furnitorit" description="Fushat me * janë të detyrueshme.">
          <SupplierForm
            mode="create"
            action={createSupplierAction}
            idempotencyKey={randomUUID()}
            cancelHref="/furnitoret"
            defaults={{
              legalName: "",
              country: "",
              identifiers: {},
              address: "",
              city: "",
              invoiceReferenceNote: "",
              active: true,
            }}
          />
        </Section>
      )}
    </div>
  );
}
