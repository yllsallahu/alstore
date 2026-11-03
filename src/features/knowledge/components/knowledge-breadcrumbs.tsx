import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppHref } from "@/lib/seo/urls";

type Crumb = { name: string; href: AppHref };

/** Visible breadcrumb trail. The last item is the current page and is not a link. */
export function KnowledgeBreadcrumbs({ trail }: { trail: Crumb[] }) {
  const t = useTranslations("Knowledge");

  return (
    <nav aria-label={t("breadcrumbLabel")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={crumb.name} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-ink">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href}
                    className="underline decoration-line-strong underline-offset-4 transition-colors duration-200 ease-standard hover:text-ink hover:decoration-accent"
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
