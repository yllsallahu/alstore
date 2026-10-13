"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Disabled while the action runs, so a double tap cannot submit twice. */
export function SubmitButton({
  children,
  pendingLabel = "Duke ruajtur…",
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} aria-disabled={pending} {...props}>
      {pending && <Loader2 aria-hidden className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
