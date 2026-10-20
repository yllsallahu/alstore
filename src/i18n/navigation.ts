import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware replacements for next/link and next/navigation. Always import these instead. */
export const { Link, getPathname, redirect, usePathname, useRouter } = createNavigation(routing);
