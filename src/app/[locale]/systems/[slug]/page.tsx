import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SystemDetail } from "@/features/catalog/components/system-detail";
import { listSystemPages, systemBySlug } from "@/features/catalog/system-specs";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Only systems with verified documents have a page; every other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return listSystemPages().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/systems/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const system = systemBySlug((await params).slug);
  if (!system) notFound();
  const t = await getTranslations({ locale, namespace: "SystemPage" });

  return buildPageMetadata({
    locale,
    href: { pathname: "/systems/[slug]", params: { slug: (await params).slug } },
    title: t(`items.${system.key}.metaTitle`),
    description: t(`items.${system.key}.metaDescription`),
  });
}

export default async function SystemPage({ params }: PageProps<"/[locale]/systems/[slug]">) {
  await resolveLocale(params);
  const system = systemBySlug((await params).slug);
  if (!system) notFound();

  return <SystemDetail system={system} />;
}
