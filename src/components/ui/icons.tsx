import type { SVGProps } from "react";

/*
 * Minimal stroke icons (24px grid, 1.5px stroke, currentColor). Decorative:
 * the accompanying text carries the meaning. Add icons only when used.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h18M3 16h18" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </Icon>
  );
}
