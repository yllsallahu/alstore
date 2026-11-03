import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { type PhotoKey, photography } from "@/config/photography";
import { cx } from "@/lib/cx";

type PhotoProps = {
  name: PhotoKey;
  /** Responsive `sizes` for the slot the photograph fills. */
  sizes: string;
  priority?: boolean;
  /** Decorative use (e.g. behind a heading that says the same): empty alt. */
  decorative?: boolean;
  className?: string;
};

/**
 * A site photograph that fills its positioned parent (`relative` + a size or aspect ratio).
 * Alt text comes from Photography.alt; local photographs get a blur placeholder from their
 * static import, remote ones load over the `bg-stone` well.
 * Pass hover or entrance motion through `className`.
 */
export async function Photo({ name, sizes, priority, decorative, className }: PhotoProps) {
  const t = await getTranslations("Photography");
  const source = photography[name];

  return (
    <Image
      src={source.src}
      alt={decorative ? "" : t(`alt.${name}`)}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={"blurDataURL" in source ? "blur" : "empty"}
      blurDataURL={"blurDataURL" in source ? source.blurDataURL : undefined}
      className={cx("object-cover", className)}
    />
  );
}
