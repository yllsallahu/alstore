/**
 * Brand asset registry.
 *
 * `logo.primary` is the owner-supplied wordmark for light backgrounds (header).
 * The inverse logo, photography and Open Graph image have not been delivered.
 * Empty slots fall back to a plain-text business name.
 *
 * To integrate a remaining file (see docs/DESIGN_RULES.md, "Brand assets"):
 *   1. Place it in /public/brand/ using the file name documented there.
 *   2. Replace the matching `null` below with { src, width, height } using the
 *      file's intrinsic pixel size (or SVG viewBox size).
 */

export type BrandImage = {
  /** Public path under /public/brand/. */
  readonly src: `/brand/${string}`;
  readonly width: number;
  readonly height: number;
};

export type BrandAssets = {
  readonly logo: {
    /** Logo for light backgrounds (header). */
    readonly primary: BrandImage | null;
    /** Logo for dark backgrounds (footer). */
    readonly inverse: BrandImage | null;
  };
  /** Default social share image, 1200×630. */
  readonly ogImage: BrandImage | null;
};

export const brandAssets: BrandAssets = {
  logo: {
    primary: { src: "/brand/alstore-logo.webp", width: 239, height: 101 },
    inverse: null,
  },
  ogImage: null,
};
