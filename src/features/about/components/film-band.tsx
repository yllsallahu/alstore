import { AmbientVideo } from "@/components/ui/ambient-video";
import { Reveal } from "@/components/ui/reveal";
import { revealImage } from "@/components/ui/reveal-classes";

/**
 * Wide, muted, looping band from EVEREST's 93 000 film (sliding glazing over a city view,
 * 1080p, caption bar cropped out). Purely atmospheric: no caption, hidden from assistive
 * technology, and reduced motion keeps the still poster.
 */
export function FilmBand() {
  return (
    <div className="px-gutter">
      <Reveal className="relative mx-auto aspect-4/3 max-w-wide overflow-hidden bg-graphite sm:aspect-21/9">
        <AmbientVideo name="interior93000" sizes="100vw" className={revealImage} />
      </Reveal>
    </div>
  );
}
