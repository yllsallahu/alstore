import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Project } from "@/features/projects/schemas";
import { Link } from "@/i18n/navigation";

/**
 * Project page: title, key facts, the original write-up and the owner-supplied photos.
 * The first photo is the LCP image and is preloaded; the rest follow in a hairline grid.
 */
export async function ProjectDetail({ project }: { project: Project }) {
  const locale = await getLocale();
  const t = await getTranslations("Projects");
  const tSystems = await getTranslations("Systems");
  const [lead, ...rest] = project.images;

  const facts = [
    { label: t("facts.location"), value: project.location[locale] },
    {
      label: t("facts.systems"),
      value: project.systems.map((key) => tSystems(`items.${key}.name`)).join(" · "),
    },
    { label: t("facts.type"), value: t(`types.${project.type}`) },
    ...(project.year ? [{ label: t("facts.year"), value: String(project.year) }] : []),
  ];

  return (
    <article>
      <Container className="pt-section">
        <Link
          href="/projects"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted transition-colors duration-200 ease-standard hover:text-ink"
        >
          {t("backToGallery")}
        </Link>
        <Eyebrow className="mt-8">{t("eyebrow")}</Eyebrow>
        <h1 className="mt-6 max-w-measure text-3xl font-semibold text-balance font-stretch-semi-expanded">
          {project.title[locale]}
        </h1>

        <dl className="mt-10 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(({ label, value }) => (
            <div key={label} className="border-r border-b border-line p-6">
              <dt className="text-xs font-semibold uppercase tracking-label text-ink-muted">
                {label}
              </dt>
              <dd className="mt-2 tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Container>

      <Container className="mt-12">
        <Image
          src={lead.src}
          alt={lead.alt[locale]}
          width={lead.width}
          height={lead.height}
          sizes="(min-width: 84rem) 78rem, 100vw"
          preload
          className="h-auto w-full bg-paper-sunken"
        />
      </Container>

      <Container className="py-section">
        <div className="max-w-measure space-y-6">
          {project.body?.[locale].map((paragraph) => (
            <p key={paragraph} className="text-lg text-pretty">
              {paragraph}
            </p>
          ))}
        </div>

        {rest.length > 0 && (
          <ul
            aria-label={t("photosLabel")}
            className="mt-16 grid border-t border-l border-line sm:grid-cols-2"
          >
            {rest.map((image) => (
              <li key={image.src} className="border-r border-b border-line bg-paper-sunken">
                <Image
                  src={image.src}
                  alt={image.alt[locale]}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 84rem) 39rem, (min-width: 40rem) 50vw, 100vw"
                  className="h-auto w-full"
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 max-w-measure text-sm text-pretty text-ink-muted">
          {project.provenance.photoCredit
            ? t("photoCredit", { credit: project.provenance.photoCredit })
            : t("footnote")}
        </p>
      </Container>
    </article>
  );
}
