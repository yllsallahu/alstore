import { getTranslations } from "next-intl/server";
import { MIN_FILTER_PROJECTS, hasDetailPage } from "@/features/projects/queries";
import type { Project } from "@/features/projects/schemas";
import { cx } from "@/lib/cx";
import { ProjectCard } from "./project-card";
import { ProjectFilters } from "./project-filters";
import { projectGridClasses } from "./project-grid";

/**
 * Project grid. Filters are added only with MIN_FILTER_PROJECTS or more projects, and only for
 * a dimension with at least two distinct values; otherwise it is a plain server-rendered list.
 */
export async function ProjectGallery({ projects }: { projects: readonly Project[] }) {
  const t = await getTranslations("Projects");
  const tSystems = await getTranslations("Systems");

  const systemKeys = [...new Set(projects.flatMap((p) => p.systems))];
  const types = [...new Set(projects.map((p) => p.type))];

  const groups = [
    {
      id: "system" as const,
      label: t("filters.system"),
      options: systemKeys.map((key) => ({ value: key, label: tSystems(`items.${key}.name`) })),
    },
    {
      id: "type" as const,
      label: t("filters.type"),
      options: types.map((type) => ({ value: type, label: t(`types.${type}`) })),
    },
  ].filter((group) => group.options.length >= 2);

  if (projects.length < MIN_FILTER_PROJECTS || groups.length === 0) {
    return (
      <ul aria-label={t("listLabel")} className={cx("mt-12 lg:mt-16", projectGridClasses)}>
        {projects.map((project) => (
          <li key={project.slug} className="border-r border-b border-line">
            <ProjectCard project={project} linked={hasDetailPage(project)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ProjectFilters
      groups={groups}
      labels={{
        filters: t("filters.label"),
        all: t("filters.all"),
        list: t("listLabel"),
        empty: t("filters.empty"),
      }}
      items={projects.map((project) => ({
        slug: project.slug,
        systems: project.systems,
        type: project.type,
        card: <ProjectCard project={project} linked={hasDetailPage(project)} />,
      }))}
    />
  );
}
