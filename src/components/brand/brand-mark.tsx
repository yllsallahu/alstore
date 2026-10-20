import Image from "next/image";
import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { cx } from "@/lib/cx";

type BrandMarkProps = {
  /** "primary" for light backgrounds, "inverse" for graphite. */
  tone?: "primary" | "inverse";
  className?: string;
};

/**
 * AL STORE identity slot. Renders the logo from the brand registry
 * (src/config/brand.ts) when that tone exists; otherwise the business name as
 * plain text in the site typeface. The fallback is deliberately not a logo design.
 *
 * Height is capped to the header bar (h-16 / sm:h-20, with the link's py-2).
 */
export function BrandMark({ tone = "primary", className }: BrandMarkProps) {
  const logo = brandAssets.logo[tone];

  if (logo) {
    return (
      <Image
        src={logo.src}
        width={logo.width}
        height={logo.height}
        alt={siteConfig.name}
        priority={tone === "primary"}
        unoptimized={logo.src.endsWith(".svg")}
        className={cx("h-10 w-auto sm:h-12", className)}
      />
    );
  }

  return (
    <span
      className={cx(
        "text-lg leading-none font-bold tracking-wide uppercase font-stretch-semi-expanded",
        className,
      )}
    >
      {siteConfig.name}
    </span>
  );
}
