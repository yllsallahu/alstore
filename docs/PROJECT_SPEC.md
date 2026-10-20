# AL STORE website: project specification

Status: **Phase 1 (foundation) complete**. Last updated 2026-10-19.

## 1. What we are building

A bilingual (Albanian / English) B2B website for **AL STORE**, a Kosovo-based distributor of
**EVEREST** aluminium and PVC systems. It has two jobs:

1. Present EVEREST products and systems as a searchable catalogue for trade buyers.
2. Turn that interest into qualified **quotation requests**.

It is not a shop. There are no prices, no cart, no online payment and no stock levels.

## 2. Verified business facts

Supplied by the owner on 2026-10-19. These are the only facts the site may state. The code
copy lives in `src/config/site.ts`. Provenance and conflicts are tracked in `docs/CONTENT_SOURCES.md`.

| Fact          | Value                                     |
| ------------- | ----------------------------------------- |
| Business name | AL STORE                                  |
| Relationship  | Distributor of EVEREST products in Kosovo |
| Address       | Isa Boletini, Radivojc 61000, Kosovo      |
| Phone         | +383 44 177 351                           |
| Email         | alstore.shpk@gmail.com                    |
| Domain        | https://www.alstore-ks.com/               |
| Manufacturer  | EVEREST, https://everest.al/              |
| Languages     | Albanian (default), English               |

## 3. Relationship wording: hard rules

The site must make the distributor relationship clear without overstating it.

**Allowed:** "AL STORE is a distributor of EVEREST products in Kosovo." / "AL STORE është
distributor i produkteve EVEREST në Kosovë." The site can link to everest.al as the manufacturer.

**Never state or imply:**

- that AL STORE manufactures EVEREST products;
- that AL STORE is the exclusive, sole or national distributor;
- that AL STORE is "the official partner" or "Everest Kosovë/Kosova" as an entity;
- that AL STORE is the same legal entity as Everest Kosovo or any EVEREST company;
- warranty terms, certifications, years of experience, project counts or client names, unless the
  owner verifies them and they are added to `CONTENT_SOURCES.md` first.

The old static site (in git history) said "partneri zyrtar i Everest Construction Group". That
wording is **not** approved. See `CONTENT_SOURCES.md`.

## 4. Audience

- Window and door fabricators and installers (primary).
- Construction companies, contractors and architects specifying systems.
- Larger private builders requesting quotes.

Most first visits are expected on mobile, often from search ("profile alumini Kosovë",
"dritare PVC Gjilan", series numbers). The mobile experience and search findability are
first-class requirements.

## 5. Goals

1. A premium architectural/industrial B2B presence. It should read like a building-products
   company, not a template.
2. Searchable EVEREST product and system information.
3. Qualified quotation requests: a structured, validated form, not an open chat.
4. Strong technical SEO for Kosovo in Albanian and English.
5. Excellent mobile usability and Core Web Vitals.
6. A scalable architecture that can move content to Supabase without a rewrite.

## 6. Phase plan

| Phase | Scope                                                                                                                                                                                        | Status   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | Foundation: stack, tokens, localization, layout shell, SEO utilities, error handling, docs                                                                                                   | **Done** |
| 2+    | To be specified by the owner. Expected areas: catalogue data model and pages, full homepage, quotation request flow, legacy URL redirects, content migration to Supabase, deployment and DNS | Pending  |

Later phases may not start until their spec is provided. Do not build ahead.

## 7. Phase 1 acceptance criteria

- [x] Next.js App Router project with TypeScript strict, Tailwind CSS, next-intl and Zod.
- [x] Documented design-token system enforced by resetting Tailwind defaults.
- [x] `sq` at `/` and `en` at `/en`, with typed message catalogues and a parity check.
- [x] Shared layout: header (identity, phone, language), footer (distributor statement, contact).
- [x] Brand-asset registry with text fallback and no invented logo.
- [x] SEO foundation: metadata builder, canonical, hreflang, robots, sitemap, LocalBusiness JSON-LD.
- [x] Indexing disabled unless `SITE_INDEXABLE=true`.
- [x] Environment template validated with Zod.
- [x] Localized 404, error boundary, root 404 and global error.
- [x] `npm run check` passes: format, messages, lint (0 warnings), typecheck, build.
- [x] No deployment and no DNS changes.

## 8. Non-negotiables (all phases)

- No fabricated company facts, products, prices, reviews, inventory or testimonials.
- No unlicensed external imagery. EVEREST material only with documented permission.
- No generic dashboard-style UI.
- No duplicated components, dead code or unused dependencies.
- No secrets in the repo. No `NEXT_PUBLIC_` prefix on secret values.
- Server Components by default; every Client Component states why it must be one.
- Never disable TypeScript or ESLint rules to hide errors.
- Never change unrelated files without a documented reason.
