import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { getProjectWithDetail, listDetailSlugs } from "@/features/projects/queries";
import { resolveLocale } from "@/i18n/locale";
import { buildPageMetadata } from "@/lib/seo/metadata";

/** Only projects that qualify for a page are built; every other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return listDetailSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/projects/[slug]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const project = getProjectWithDetail((await params).slug);
  if (!project) notFound();

  return buildPageMetadata({
    locale,
    href: { pathname: "/projects/[slug]", params: { slug: project.slug } },
    title: project.title[locale],
    description: project.summary[locale],
  });
}

/** Project detail page (see the detail rule in src/features/projects/queries.ts). */
export default async function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  await resolveLocale(params);
  const project = getProjectWithDetail((await params).slug);
  if (!project) notFound();

  return <ProjectDetail project={project} />;
}
