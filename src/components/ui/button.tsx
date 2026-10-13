import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed aria-disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-on-brand hover:bg-brand-hover disabled:bg-line disabled:text-ink-muted aria-disabled:bg-line aria-disabled:text-ink-muted",
        secondary:
          "border border-line-strong bg-surface text-ink hover:bg-canvas disabled:text-ink-muted aria-disabled:text-ink-muted",
        ghost: "text-ink hover:bg-brand-soft",
      },
      size: {
        md: "h-11 px-4",
        lg: "h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
