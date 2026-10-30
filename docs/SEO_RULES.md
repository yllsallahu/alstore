# SEO rules

Target: organic visibility in **Kosovo**, Albanian first, English second, for trade buyers
searching EVEREST systems, aluminium/PVC profiles and window/door systems.

## 1. URLs and languages

| Locale             | Prefix | Home                            | `<html lang>` | hreflang          |
| ------------------ | ------ | ------------------------------- | ------------- | ----------------- |
| Albanian (default) | none   | `https://www.alstore-ks.com/`   | `sq`          | `sq`, `x-default` |
| English            | `/en`  | `https://www.alstore-ks.com/en` | `en`          | `en`              |

- **Canonical host:** `https://www.alstore-ks.com` (with `www`, HTTPS, no trailing slash except
  the root). The apex domain must 301 to `www` at hosting level (deployment phase).
- **No language auto-redirects and no locale cookie** (`localeDetection: false`,
  `localeCookie: false`). Every URL always serves one language, so Googlebot, which crawls without
  `Accept-Language`, sees exactly what users see.
- **hreflang uses `sq` and `en`, not `sq-XK`.** `XK` is not an official ISO 3166 code and is not
  reliably recognised for hreflang. Kosovo targeting comes from content, the address, LocalBusiness
  data and (later) Search Console settings.
- **Localized slugs:** each route has an Albanian slug and an English slug, declared in
  `src/i18n/routing.ts` → `pathnames`. Slugs are lowercase ASCII with hyphens. Albanian letters
  are transliterated (`ë→e`, `ç→c`). Shipped: `/dokumentet` ↔ `/en/documents` (technical
  documents). Example convention for later catalogue routes: `/produktet` ↔ `/en/products`,
  `/kerkese-per-oferte` ↔ `/en/request-a-quote`.
- English copy uses British spelling ("aluminium", "catalogue") to match the source material.

## 2. Indexing switch

Indexing is **off by default** everywhere:

- `SITE_INDEXABLE` unset or anything except `"true"` → `robots.txt` serves `Disallow: /` and every
  page gets `<meta name="robots" content="noindex, nofollow">`.
- Set `SITE_INDEXABLE=true` **only** on the approved production deployment at go-live. Preview and
  staging deployments must never set it.

## 3. Per-page metadata

Every indexable page exports `generateMetadata` that returns `buildPageMetadata()` from
`src/lib/seo/metadata.ts`. It produces:

- `title`, templated as `"%s | AL STORE"` (home uses `absoluteTitle`);
- `description` (Albanian ≈ 140–160 chars; must describe the page truthfully);
- a self-referencing `canonical`;
- `alternates.languages` for both locales plus `x-default`;
- Open Graph (`sq_AL` / `en_GB`, site name, URL, and the default image once `brandAssets.ogImage`
  exists).

Rules: one `h1` per page, matching the page's intent. Titles and descriptions come from message
catalogues (`metaTitle`, `metaDescription` keys), never hard-coded. Don't stuff keywords. Series
numbers (e.g. "70 000") are valuable search terms but only appear once verified product data
exists.

## 4. Sitemap

`src/app/sitemap.ts` lists the Albanian URL of each indexable route with hreflang alternates for
both locales. Add a route to `indexableRoutes` when its page ships. Catalogue pages will be
appended from the content layer. Omit `lastModified` unless the real modification date is known.

## 5. Structured data

- `LocalBusiness` JSON-LD is rendered on the home page from `src/lib/seo/structured-data.ts`. It
  uses only verified facts: name, URL, phone, email, postal address, area served, and EVEREST as
  `brand`.
- **Do not add** opening hours, geo coordinates, `aggregateRating`, reviews, `priceRange` or
  `sameAs` profiles until they are verified and recorded in `CONTENT_SOURCES.md`.
- Later phases: `Product` for catalogue items (no `offers`/prices, since we don't publish them),
  and `BreadcrumbList` on nested pages.
- Use the `<JsonLd>` component. It escapes `<` to keep the script tag safe.

## 6. Legacy URLs (from the previous static site)

The old site published these URLs (per its `sitemap.xml` and `llms.txt` in git history). The live
site could not be checked from the build environment. Before go-live, each must get a **301** to
its closest new page, or be deliberately allowed to 404 if no equivalent exists:

`/everest-kosove/`, `/about.html`, `/contact.html`, `/certificate.html`, `/faq.html`,
`/portfolio-overview.html`, `/portfolio-item.html`, `/blog-home.html`, `/blog-post.html`,
`/everest.pdf`, `/llms.txt`.

Redirects belong in `next.config.ts` `redirects()` once the target pages exist (Phase 2+).

## 7. Performance (ranking and UX)

Targets measured on mobile (4G, mid-range Android) at the 75th percentile: **LCP < 2.5s,
INP < 200ms, CLS < 0.1**.

- Static rendering by default (`generateStaticParams` + `setRequestLocale`).
- One self-hosted variable font with `display: swap` (preloaded by `next/font`). No third-party
  font requests.
- Client JavaScript only where interaction requires it. Only the needed message namespaces are
  sent to the browser. GSAP is dynamically imported from `TruckScrollHero`.
- Images via `next/image` with dimensions, WebP sources, AVIF negotiation, and lazy-load below
  the fold. The LCP poster gets `priority` / `fetchPriority="high"` (Next emits the preload).
- Long-cache `Cache-Control` for `/media`, `/brand`, `/_next/static`; shorter for `/documents`.
- No third-party scripts (analytics, chat, maps) without a documented decision covering
  performance and privacy.
