import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/** Centred page column: max width `site`, side padding `gutter`. Use for every full-width band. */
export function Container({ children, className }: ContainerProps) {
  return <div className={cx("mx-auto w-full max-w-site px-gutter", className)}>{children}</div>;
}
