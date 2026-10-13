import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  badges,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: { href: string; label: string }[];
  actions?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Vendndodhja" className="text-ink-muted mb-2 text-sm">
          <ol className="flex flex-wrap items-center gap-1">
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1">
                <Link
                  href={crumb.href}
                  className="hover:text-ink underline-offset-2 hover:underline"
                >
                  {crumb.label}
                </Link>
                <span aria-hidden>/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
            {badges}
          </div>
          {description && <p className="text-ink-muted mt-1 max-w-prose">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-titulli` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className="border-line bg-surface mt-6 rounded-lg border p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="text-ink-muted mt-1 text-sm">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
