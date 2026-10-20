import { notFound } from "next/navigation";

/** Routes every unknown localized path to app/[locale]/not-found.tsx. */
export default function CatchAllPage() {
  notFound();
}
