import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Project } from "@/features/projects/schemas";
import { Link } from "@/i18n/navigation";

type ProjectCardProps = {
  project: Project;
  /** Link the card to its detail page (only when the project has one). */
  linked: boolean;
};

/** One gallery entry: cover photo, type and location, title, summary and systems used. */
export async function ProjectCard({ project, linked }: ProjectCardProps) {
  const locale = await getLocale();
  const t = await getTranslations("Projects");
  const tSystems = await getTranslations("Systems");
  const [cover] = project.images;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-4/3 overflow-hidden bg-paper-sunken">
        <Image
          src={cover.src}
          alt={cover.alt[locale]}
          width={cover.width}
          height={cover.height}
          sizes="(min-width: 64rem) 28rem, (min-width: 40rem) 50vw, 100vw"
          className="size-full object-cover transition-opacity duration-200 ease-standard group-hover:opacity-90"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-label text-accent-ink">
          {t(`types.${project.type}`)} · {project.location[locale]}
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-balance text-brand font-stretch-semi-expanded">
          {linked ? (
            <Link
              href={{ pathname: "/projects/[slug]", params: { slug: project.slug } }}
              className="underline-offset-4 after:absolute after:inset-0 group-hover:underline"
            >
              {project.title[locale]}
            </Link>
          ) : (
            project.title[locale]
          )}
        </h3>
        <p className="mt-4 text-pretty text-ink-muted">{project.summary[locale]}</p>
        <p className="mt-auto pt-6 text-sm tabular-nums text-ink">
          <span className="sr-only">{t("facts.systems")}: </span>
          {project.systems.map((key) => tSystems(`items.${key}.name`)).join(" · ")}
        </p>
      </div>
    </article>
  );
}
