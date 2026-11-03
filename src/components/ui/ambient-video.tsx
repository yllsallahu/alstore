import Image from "next/image";
import { type AmbientLoopKey, ambientLoops } from "@/config/media";
import { cx } from "@/lib/cx";

type AmbientVideoProps = {
  name: AmbientLoopKey;
  /** Responsive `sizes` for the poster. */
  sizes: string;
  priority?: boolean;
  /** Motion for the poster and the clip together (entrance, reveal). */
  className?: string;
};

/**
 * A muted, looping, captionless clip that fills its positioned parent like a photograph.
 * Purely atmospheric, so it is hidden from assistive technology. The poster sits underneath
 * while the clip loads; under reduced motion only the poster shows.
 */
export function AmbientVideo({ name, sizes, priority, className }: AmbientVideoProps) {
  const { video, poster } = ambientLoops[name];

  return (
    <div aria-hidden="true" className={cx("absolute inset-0", className)}>
      <Image
        src={poster.src}
        alt=""
        width={poster.width}
        height={poster.height}
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 size-full object-cover"
      />
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster.src}
        className="absolute inset-0 size-full object-cover motion-reduce:hidden"
      >
        <source src={video} type="video/mp4" />
      </video>
    </div>
  );
}
