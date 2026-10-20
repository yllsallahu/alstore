import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes and any path with a file extension
  // (robots.txt, sitemap.xml, /brand/*.svg, …).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
