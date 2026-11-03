import type { Project } from "./schemas";

/**
 * Approved AL STORE projects. EMPTY on purpose: no project photography or client consent has
 * been delivered yet (CONTENT_SOURCES.md §4 and §7). Don't add examples, stock photos,
 * renders or projects from EVEREST's own portfolio.
 *
 * To add an approved project:
 * 1. Collect the evidence listed in CONTENT_SOURCES.md §7 (owner-supplied photos, written client
 *    consent, location, system used) and add a row to the register there.
 * 2. Save the photos to public/media/projects/<slug>/ (≥ 1600px on the long edge, JPG or WebP,
 *    EXIF location data removed) and record each file's pixel width and height below.
 * 3. Add the record here. `listProjects()` validates it against `projectSchema` at build time.
 *
 * The gallery route switches on by itself once there are MIN_GALLERY_PROJECTS records, and a
 * project gets its own page when it meets the detail rule in queries.ts. Then add the routes to
 * src/app/sitemap.ts (see ARCHITECTURE.md, "Projects").
 */
export const projects: readonly Project[] = [];
