# Architecture

## 1. Stack (pinned exact versions)

| Package                            | Version | Why                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next                               | 16.4.2  | Current stable. App Router, Turbopack, `proxy.ts`, typed `PageProps`.                                                                                                                                                                                                                                            |
| react / react-dom                  | 19.3.1  | Required by Next 16.                                                                                                                                                                                                                                                                                             |
| next-intl                          | 4.14.9  | Localized routing and messages. Peer range covers Next 16.                                                                                                                                                                                                                                                       |
| zod                                | 4.6.7   | Environment validation now; form and content validation later.                                                                                                                                                                                                                                                   |
| tailwindcss + @tailwindcss/postcss | 4.3.3   | CSS-first `@theme` tokens.                                                                                                                                                                                                                                                                                       |
| typescript                         | 6.0.3   | **Not 7.x.** TS 7 (native compiler) is a new major; Next's build-time type check and typescript-eslint are proven on 6.x. Revisit once Next documents TS 7 support.                                                                                                                                              |
| eslint                             | 9.39.5  | **Not 10.x.** `eslint-config-next` 16.4.2 depends on `eslint-plugin-react` 7.37, `eslint-plugin-import` 2.32 and `eslint-plugin-jsx-a11y` 6.10, whose peer ranges stop at ESLint 9. npm prints a "no longer supported" notice for 9.x; upgrade together with `eslint-config-next` once those plugins support 10. |
| eslint-config-next                 | 16.4.2  | Core Web Vitals + TypeScript rule sets.                                                                                                                                                                                                                                                                          |
| gsap                               | 3.15.0  | Owner-requested scroll-pinned truck showcase (`TruckScrollHero`). ScrollTrigger ships in the package; **dynamically imported** inside that Client Component so it is not in the initial JS. CSS scroll timelines lack Safari support for pinning + scrub.                                                        |
| prettier                           | 3.9.10  | Formatting, enforced by `npm run format:check`.                                                                                                                                                                                                                                                                  |

Node ≥ 22.12 (`.nvmrc` = 22). Deliberately **not** added: UI kits, icon packs, clsx or
tailwind-merge, animation libraries (except gsap, above), state managers, analytics. Add a dependency only with a
documented reason in this file.

## 2. Directory layout

```
src/
  app/
    layout.tsx               pass-through root layout (imports globals.css)
    not-found.tsx            bilingual 404 for paths outside [locale]
    global-error.tsx         bilingual fallback if the root layout fails (client)
    robots.ts  sitemap.ts    SEO routes (see SEO_RULES.md)
    [locale]/
      layout.tsx             <html lang>, metadata defaults, header/footer, intl provider
      page.tsx               home (introduction, history, systems, contact)
      documents/page.tsx     technical documents (reports, declarations, certifications)
      not-found.tsx          localized 404
      error.tsx              localized error boundary (client)
      [...rest]/page.tsx     sends unknown localized paths to not-found
  components/
    ui/                      primitives: Container, Eyebrow, buttonClasses()
    layout/                  SiteHeader, HeaderFrame, SiteFooter, LocaleSwitcher, MobileNav
    brand/                   BrandMark (official-logo slot with text fallback)
    seo/                     JsonLd
  features/
    catalog/
      components/          ProductCategories, SystemsSection, DocumentViewer
      documents.ts         verified technical-document register (lab PDFs in public/documents/)
      systems.ts           EVEREST systems shown on the homepage (sources in CONTENT_SOURCES §5)
      queries.ts           server validation of that register
    home/
      components/          DeferredHeroVideo, TruckScrollHero
      truck-assets.ts      optional truck cut-out registry
  config/
    site.ts                  verified business facts (single source of truth)
    brand.ts                 brand asset registry (header logo filled; inverse and OG still null)
    env.ts                   Zod-validated server environment
  i18n/
    routing.ts               locales, prefix strategy, localized pathnames
    navigation.ts            locale-aware Link / redirect / usePathname / getPathname
    request.ts               per-request locale, messages, time zone
    locale.ts                resolveLocale(): validate param + setRequestLocale
  lib/
    cx.ts                    class-name joiner
    seo/urls.ts              absoluteUrl(), languageAlternates()
    seo/metadata.ts          buildPageMetadata()
    seo/structured-data.ts   localBusinessJsonLd()
  messages/sq.json en.json   message catalogues (sq is the typed reference)
  styles/
    globals.css              Tailwind import + base layer
    tokens.css               design tokens (@theme)
    fonts.ts  fonts/         self-hosted Archivo variable + OFL licence
  proxy.ts                   next-intl locale routing (Next 16 "proxy", formerly middleware)
  global.d.ts                next-intl AppConfig typing (Locale, Messages)
scripts/check-messages.mjs   sq/en key and placeholder parity
AGENTS.md                    generated and maintained by `next dev`: points agents to the
                             version-matched Next.js docs in node_modules/next/dist/docs/
```

### Feature modules (from Phase 2)

Domain features live in `src/features/<feature>/`, for example `catalog` and `quote`:

```
src/features/catalog/
  components/      feature UI (Server Components unless interactive)
  schemas.ts       Zod schemas = runtime validation + inferred types
  queries.ts       server-only read functions used by pages
```

Routes in `src/app/[locale]/…` stay thin: resolve the locale, call feature queries, render
feature components. Shared, domain-free UI goes in `src/components/ui/`. Don't create empty
feature folders ahead of their phase.

## 3. Rendering model

- **Server Components by default.** Pages are statically generated per locale
  (`generateStaticParams` in `[locale]/layout.tsx`, `setRequestLocale` via `resolveLocale`).
- **Client Components (current, complete list):** `LocaleSwitcher` (needs the current
  pathname), `MobileNav` (menu open/close), `HeaderFrame` (transparent header over the home hero:
  pathname + scroll position), `DeferredHeroVideo` (idle-loads the hero MP4 after the poster LCP),
  `TruckScrollHero` (GSAP scroll story), `DocumentViewer` (selected technical document),
  `[locale]/error.tsx` and `global-error.tsx` (Next.js requires it). Each new one needs a comment
  justifying it.
- `NextIntlClientProvider` receives **only** the namespaces client components use
  (`LocaleSwitcher`, `TruckScrollHero`, `Documents`, `Error`). Add a namespace there when a new
  client component needs one.

## 4. Localization flow

1. `src/proxy.ts` (next-intl middleware) maps `/` → `[locale]=sq` and `/en/...` →
   `[locale]=en`. Paths with a file extension, `_next` and `api` are skipped.
2. `[locale]/layout.tsx` validates the locale (`resolveLocale`, 404 if unknown) and renders
   `<html lang>`.
3. `src/i18n/request.ts` loads `src/messages/<locale>.json` and fixes the time zone to
   `Europe/Belgrade` (Kosovo's zone).
4. Components use `useTranslations` (sync) or `getTranslations` (async). Keys are type-checked
   against `sq.json`. `npm run check:messages` ensures `en.json` has the same keys and
   placeholders.
5. Internal links use `Link` from `@/i18n/navigation`, never `next/link`. The only exception is
   the root `not-found.tsx`, which has no locale.

**Adding a route:** add its key and both slugs to `routing.pathnames`, add messages to both
catalogues, create `src/app/[locale]/<key>/page.tsx` with `generateMetadata` →
`buildPageMetadata`, and list it in `sitemap.ts` if indexable. When the first dynamic route
lands, update `LocaleSwitcher` to pass `{ pathname, params }`.

## 5. Configuration and secrets

- `src/config/env.ts` parses `process.env` with Zod at module load. A bad value fails the build
  with a readable error.
- Phase 1 variables: `SITE_URL` (default `https://www.alstore-ks.com`) and `SITE_INDEXABLE`
  (default `false`). Both are server-only. See `.env.example`.
- Future secrets (Supabase secret key, email provider keys) go in the same schema, never with a
  `NEXT_PUBLIC_` prefix, and are imported only from server modules.

## 6. Future content layer (Supabase-ready, no database yet)

Pages never read content sources directly. In Phase 2 each feature gets **server-side query
functions** (`src/features/<feature>/queries.ts`) that return Zod-validated domain types:

```
page.tsx  →  features/catalog/queries.ts  →  source (Phase 2: typed local data files
                                                      later: Supabase client)
```

- The query function signatures are the contract. Switching the source to Supabase changes only
  the query implementation, not pages or components.
- Data from any source is parsed with the feature's Zod schema before it reaches UI.
- Localized fields are modelled explicitly (`name: { sq, en }`) so the CMS schema can mirror them.
- Supabase specifics (RLS, keys, storage for images and `next.config.ts` `images.remotePatterns`)
  are decided in the phase that introduces it.

## 7. Errors and 404s

| Situation                                   | Handler                                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| Unknown path under a locale (`/x`, `/en/x`) | `[...rest]` → `[locale]/not-found.tsx` (localized, 404) |
| Unknown locale segment                      | `resolveLocale` → `notFound()`                          |
| Render error inside a page                  | `[locale]/error.tsx` (localized, retry)                 |
| Root layout failure                         | `global-error.tsx` (bilingual)                          |
| Missing static file path (has extension)    | `app/not-found.tsx` (bilingual)                         |

**Known framework behaviour (Next 16.3–16.4):** for `notFound()` raised by the dynamic
`[...rest]` route, Next.js returns the correct **404 status** and a `noindex` tag, but the initial
HTML is a minimal shell (`<html id="__next_error__">`) and the localized not-found UI is rendered
from the RSC payload on the client. This reproduces in a bare Next.js app without next-intl, so
it is not caused by this codebase. SEO impact is nil (404 + noindex); only no-JS visitors to
unknown URLs see a blank page. Re-test on Next.js upgrades; don't work around it.

## 8. Quality gates

`npm run check` runs `format:check`, `check:messages`, `lint` (`--max-warnings=0`), `typecheck`
(`next typegen && tsc --noEmit`) and `build`. All must pass before a phase is considered done.
Rules are never disabled to make a check pass.

## 9. Repository history note

The repository previously held a different project: an internal wholesale/ERP app ("AL STORE
V7", Next 16 + Drizzle + Postgres), and before that a static marketing site. Both were removed
by the owner in commits `81f5a2b` ("delete") and `c3841d8`. Nothing from them is reused except
as reference in `CONTENT_SOURCES.md`. The GitHub repository is **public**, and its history still
contains the old code and two business spreadsheets under `reference_excel/`. Purging them
requires a history rewrite, which is an owner decision outside Phase 1.
