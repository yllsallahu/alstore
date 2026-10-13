import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/master-data/page-header";
import { ProductForm } from "@/components/master-data/product-form";
import { Unavailable } from "@/components/master-data/unavailable";
import { getRequestContext } from "@/server/auth/session";

import { createProductAction } from "../actions";

export const metadata: Metadata = { title: "Produkt i ri" };

export default async function NewProductPage() {
  const ctx = await getRequestContext();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Produkt i ri"
        crumbs={[
          { href: "/stoku", label: "Stoku" },
          { href: "/stoku/produktet", label: "Produktet" },
        ]}
      />
      {ctx.kind !== "ready" ? (
        <Unavailable context={ctx} />
      ) : (
        <Section title="Të dhënat e produktit" description="Fushat me * janë të detyrueshme.">
          <ProductForm
            mode="create"
            action={createProductAction}
            idempotencyKey={randomUUID()}
            cancelHref="/stoku/produktet"
            defaults={{
              sku: "",
              name: "",
              category: "",
              unit: "",
              barcode: "",
              referencePurchasePrice: "",
              active: true,
            }}
          />
        </Section>
      )}
    </div>
  );
}
