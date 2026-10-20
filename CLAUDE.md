# AL STORE website: agent instructions

Bilingual (sq/en) B2B catalogue and quotation website for AL STORE, a Kosovo **distributor** of
EVEREST aluminium and PVC systems. Phase 1 (foundation) is complete. Build only the phase you
are given.

Read before changing anything: `docs/PROJECT_SPEC.md` (scope, facts, wording rules),
`docs/ARCHITECTURE.md` (structure), `docs/DESIGN_RULES.md` (tokens, components, brand slots),
`docs/SEO_RULES.md` (URLs, metadata, indexing), `docs/CONTENT_SOURCES.md` (what is verified).

@AGENTS.md: this is Next.js 16. Check the bundled docs in `node_modules/next/dist/docs/`
before using an API from memory (e.g. `proxy.ts` replaced `middleware.ts`, `next lint` is gone).

## Commands

```bash
npm install
npm run dev              # http://localhost:3000 (sq) and /en
npm run check            # format:check + check:messages + lint + typecheck + build (must pass)
npm run format           # prettier --write
```

## Hard rules

- **Facts:** only values in `src/config/site.ts` / `CONTENT_SOURCES.md §1`. Never write that
  AL STORE manufactures EVEREST products, is the exclusive/official/national distributor, or is
  Everest Kosovo. No invented products, prices, stock, reviews, clients, certifications or
  warranties.
- **Brand:** no invented logos or icons. Use `<BrandMark>` and fill `src/config/brand.ts` when
  official files arrive in `public/brand/`.
- **Copy:** every user-facing string goes in `src/messages/sq.json` **and** `en.json` (same keys).
  Albanian is the default and reference locale. English uses British spelling.
- **Links:** use `Link`/`redirect`/`usePathname` from `@/i18n/navigation`, not `next/link` or
  `next/navigation` (except `notFound`).
- **Styling:** tokens only (`bg-paper`, `text-ink`, `px-gutter`, `text-display`, …). Tailwind's
  default colours, type scale, radii and shadows are disabled on purpose. No arbitrary values. Add
  a token in `src/styles/tokens.css` and document it in `DESIGN_RULES.md`.
- **Rendering:** Server Components by default. A `"use client"` file needs a comment saying why,
  and its message namespace must be added to the provider in `src/app/[locale]/layout.tsx`.
- **SEO:** indexable pages export `generateMetadata` → `buildPageMetadata()`, and are added to
  `src/app/sitemap.ts`. Never set `SITE_INDEXABLE=true` outside approved production.
- **Env:** add variables to the Zod schema in `src/config/env.ts` and to `.env.example`. Secrets
  are never `NEXT_PUBLIC_`.
- **Hygiene:** no new dependencies without a reason recorded in `docs/ARCHITECTURE.md`. No dead
  code, duplicate components or empty placeholder folders. Never disable TS/ESLint rules to pass
  checks. Don't touch unrelated files.
- **Ops:** do not deploy, change DNS or rewrite git history unless the owner explicitly asks.

## Where things go

`src/app/[locale]/…` routes (thin) · `src/features/<feature>/` domain UI, schemas, queries
(Phase 2+) · `src/components/{ui,layout,brand,seo}` shared UI · `src/config` facts, brand, env ·
`src/lib/seo` metadata, URLs, JSON-LD · `src/i18n` routing and request config.
