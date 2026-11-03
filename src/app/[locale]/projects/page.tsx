import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ProjectGallery } from "@/features/projects/components/project-gallery";
import { listGalleryProjects } from "@/features/projects/queries";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Projects" });

  return buildPageMetadata({
    locale,
    href: "/projects",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Projects gallery. Returns 404 until MIN_GALLERY_PROJECTS approved projects exist, so no
 * empty or thin page is published (docs/CONTENT_SOURCES.md §7).
 */
export default async function ProjectsPage({ params }: PageProps<"/[locale]/projects">) {
  await resolveLocale(params);
  const projects = listGalleryProjects();
  if (projects.length === 0) notFound();

  const t = await getTranslations("Projects");

  return (
    <Container className="py-section">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-6 max-w-measure text-3xl font-semibold text-balance font-stretch-semi-expanded">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-measure text-pretty text-ink-muted">{t("intro")}</p>
      <ProjectGallery projects={projects} />
      <p className="mt-8 max-w-measure text-sm text-pretty text-ink-muted">{t("footnote")}</p>
    </Container>
  );
}
