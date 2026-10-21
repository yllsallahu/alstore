import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DocumentViewer } from "@/features/catalog/components/document-viewer";
import { listTechnicalDocuments } from "@/features/catalog/queries";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/documents">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Documents" });

  return buildPageMetadata({
    locale,
    href: "/documents",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Technical documents: laboratory reports, declarations and certifications. */
export default async function DocumentsPage({ params }: PageProps<"/[locale]/documents">) {
  await resolveLocale(params);
  const t = await getTranslations("Documents");
  const documents = listTechnicalDocuments();

  return (
    <Container className="py-section">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-6 max-w-measure text-3xl font-semibold text-balance font-stretch-semi-expanded">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-measure text-pretty text-ink-muted">{t("intro")}</p>
      <DocumentViewer documents={documents} />
    </Container>
  );
}
