import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { CustomerForm } from "@/components/master-data/customer-form";
import { PageHeader, Section } from "@/components/master-data/page-header";
import { Unavailable } from "@/components/master-data/unavailable";
import { getRequestContext } from "@/server/auth/session";
import { listFormatRules } from "@/server/services/master-data/identifier-rules";

import { createCustomerAction } from "../actions";

export const metadata: Metadata = { title: "Klient i ri" };

export default async function NewCustomerPage() {
  const ctx = await getRequestContext();
  const rules =
    ctx.kind === "ready"
      ? (await listFormatRules(ctx.db, ctx.actor)).filter((rule) => rule.status === "ACTIVE")
      : [];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Klient i ri" crumbs={[{ href: "/klientet", label: "Klientët" }]} />
      {ctx.kind !== "ready" ? (
        <Unavailable context={ctx} />
      ) : (
        <Section
          title="Biznesi i regjistruar"
          description="Klienti fillon si i paverifikuar. Pas ruajtjes, verifikimi bëhet në faqen e klientit."
        >
          <CustomerForm
            mode="create"
            action={createCustomerAction}
            idempotencyKey={randomUUID()}
            cancelHref="/klientet"
            rules={rules}
            defaults={{ legalName: "", identifiers: {}, address: "", city: "", active: true }}
          />
        </Section>
      )}
    </div>
  );
}
