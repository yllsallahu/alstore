import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { AmbientVideo } from "@/components/ui/ambient-video";
import { Photo } from "@/components/ui/photo";
import type { AmbientLoopKey } from "@/config/media";
import type { PhotoKey } from "@/config/photography";

type PageHeroProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Wide photograph under the heading. */
  photo?: PhotoKey;
  /** Wide muted loop under the heading, instead of a photograph. */
  video?: AmbientLoopKey;
  /** Breadcrumbs or a back link above the heading. */
  breadcrumbs?: ReactNode;
  /** Actions under the lead. */
  children?: ReactNode;
};

/**
 * Inner-page opening: eyebrow, a large light H1 and a short lead on a 12-column grid,
 * then an optional cinematic photograph or muted loop that settles in once on load.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  photo,
  video,
  breadcrumbs,
  children,
}: PageHeroProps) {
  return (
    <section aria-labelledby="page-title">
      <Container className="pt-10 pb-12 sm:pt-14 lg:pt-20 lg:pb-16">
        {breadcrumbs}
        <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end lg:mt-14">
          <div className="md:col-span-8">
            <Eyebrow className="animate-rise motion-reduce:animate-none">{eyebrow}</Eyebrow>
            <h1
              id="page-title"
              className="mt-6 max-w-headline text-display font-light text-balance font-stretch-semi-expanded animate-rise-2 motion-reduce:animate-none"
            >
              {title}
            </h1>
          </div>
          {lead || children ? (
            <div className="animate-rise-3 motion-reduce:animate-none md:col-span-4">
              {lead ? <p className="max-w-sm text-lg text-pretty text-ink-muted">{lead}</p> : null}
              {children ? (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>

      {photo || video ? (
        <div className="px-gutter">
          <div className="relative mx-auto aspect-4/3 max-w-wide overflow-hidden bg-stone sm:aspect-21/9">
            {video ? (
              <AmbientVideo
                name={video}
                priority
                sizes="100vw"
                className="animate-settle motion-reduce:animate-none"
              />
            ) : photo ? (
              <Photo
                name={photo}
                priority
                sizes="100vw"
                className="animate-settle motion-reduce:animate-none"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
