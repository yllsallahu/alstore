"use client";
// Client Component: an IntersectionObserver reveals the children once they scroll into view.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps server-rendered content that fades in on first scroll into view. Children opt in
 * with `group-data-hidden/reveal:` utilities. Content renders visible on the server and
 * is hidden only while it is still below the fold, so it never disappears without
 * JavaScript, and reduced motion skips the effect entirely.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setHidden(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-hidden={hidden ? "" : undefined} className={cx("group/reveal", className)}>
      {children}
    </div>
  );
}
