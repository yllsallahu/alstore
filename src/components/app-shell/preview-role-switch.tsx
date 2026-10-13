"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { switchPreviewRole } from "@/app/(app)/preview-actions";

/** Development preview only: switch the synthetic user and stay on the same page. */
export function PreviewRoleSwitch({ to, label }: { to: "DIRECTOR" | "ACCOUNTANT"; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams(params.toString());
  query.delete("ruajtur");
  const back = query.toString() ? `${pathname}?${query.toString()}` : pathname;
  return (
    <form action={switchPreviewRole} className="flex items-center gap-2">
      <input type="hidden" name="role" value={to} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className="border-warn/40 bg-surface text-ink hover:bg-canvas min-h-10 rounded-md border px-3 font-medium"
      >
        {label}
      </button>
    </form>
  );
}
