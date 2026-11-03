import { z } from "zod";
import { projects } from "./projects";
import { type Project, projectSchema } from "./schemas";

/**
 * Server reads for the Projects gallery. Pages call these; nothing renders the raw register.
 *
 * Thin-content rules (docs/CONTENT_SOURCES.md §7):
 * - The gallery page exists only with at least MIN_GALLERY_PROJECTS approved projects.
 *   Below that, the route returns notFound() and nothing is linked or listed in the sitemap.
 * - Filters appear only with at least MIN_FILTER_PROJECTS projects, and only for a dimension
 *   (system or project type) with two or more distinct values.
 * - A project gets a detail page only with an original write-up (`body`) and at least
 *   MIN_DETAIL_IMAGES photos. Otherwise its card stands alone, without a link.
 */
export const MIN_GALLERY_PROJECTS = 3;
export const MIN_FILTER_PROJECTS = 6;
export const MIN_DETAIL_IMAGES = 3;

function validatedProjects(): readonly Project[] {
  const parsed = z.array(projectSchema).safeParse(projects);

  if (!parsed.success) {
    throw new Error(`Invalid projects:\n${z.prettifyError(parsed.error)}`);
  }

  const slugs = new Set<string>();
  for (const { slug } of parsed.data) {
    if (slugs.has(slug)) throw new Error(`Duplicate project slug: ${slug}`);
    slugs.add(slug);
  }

  return parsed.data;
}

/** Projects for the gallery, or an empty list while there are too few to publish one. */
export function listGalleryProjects(): readonly Project[] {
  const all = validatedProjects();
  return all.length >= MIN_GALLERY_PROJECTS ? all : [];
}

export function hasDetailPage(project: Project): boolean {
  return Boolean(project.body) && project.images.length >= MIN_DETAIL_IMAGES;
}

/** A published project that qualifies for its own page, or null. */
export function getProjectWithDetail(slug: string): Project | null {
  const project = listGalleryProjects().find((p) => p.slug === slug);
  return project && hasDetailPage(project) ? project : null;
}

export function listDetailSlugs(): string[] {
  return listGalleryProjects()
    .filter(hasDetailPage)
    .map(({ slug }) => slug);
}
