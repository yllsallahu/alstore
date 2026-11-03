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
  documents), `/njohuri` ↔ `/en/knowledge` (knowledge centre) one slug pair per article
  (`/njohuri/<albanian-slug>` ↔ `/en/knowledge/<english-slug>`, keyed `/knowledge/<article-key>`),
  system pages `/sistemet/<series>` ↔ `/en/systems/<series>` (series number, e.g. `71000`, only
  for systems in `system-specs.ts`) and `/sistemet/krahaso` ↔ `/en/systems/compare` (one URL;
  the selection is a query string the canonical omits). Example convention for later catalogue routes: `/produktet` ↔ `/en/products`,
  `/kerkese-per-oferte` ↔ `/en/request-a-quote`.
- English copy uses British spelling ("aluminium", "catalogue") to match the source material.

## 2. Indexing switch

Indexing is **off by default** everywhere:

- `SITE_INDEXABLE` unset or anything except `"true"` → `robots.txt` serves `Disallow: /` and every
  page gets `<meta name="robots" content="noindex, nofollow">`.
- Set `SITE_INDEXABLE=true` **only** on the approved production deployment at go-live. Preview and
  staging deployments must never set it.
- **Search Console:** set `GOOGLE_SITE_VERIFICATION` (the token from the "HTML tag" method) in the
  hosting environment; the layout renders `<meta name="google-site-verification">` only when it
  is set. Prefer the Domain property (DNS TXT record), which needs no code. Never commit the token.

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
catalogues (`metaTitle`, `metaDescription` keys), never hard-coded. Exception: knowledge-centre
articles keep `metaTitle` (≤ 60 chars) and `metaDescription` (110–165 chars, Zod-checked) in
their content module next to the body, and set Open Graph `type: article`. Don't stuff keywords. Series
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
- `Product` JSON-LD on each system page (`src/features/catalog/structured-data.ts`): EVEREST as
  brand and manufacturer, no `offers`, prices, ratings or availability.
- `WebSite` JSON-LD (name, URL, languages, publisher → the business `@id`) is rendered on the
  home page next to `LocalBusiness`. `LocalBusiness` is a subtype of `Organization`, so no separate
  `Organization` node is emitted (it would duplicate the same entity).
- `BreadcrumbList` is rendered on nested pages via `breadcrumbJsonLd()` (shipped:
  `/dokumentet`, `/njohuri`, each article, each system page and the comparison).
- `Article` JSON-LD on each knowledge-centre article (`src/features/knowledge/structured-data.ts`):
  headline, description, language, `datePublished`/`dateModified` = the article's `reviewedOn`
  date, AL STORE as author and publisher (no invented people), and `citation` = the article's
  source list. No `image` until approved artwork exists.
- Use the `<JsonLd>` component. It escapes `<` to keep the script tag safe.

## 6. Legacy URLs (from the previous static site)

The old site published these URLs (per its `sitemap.xml` and `llms.txt` in git history). Those
with an equivalent page get a permanent (308) redirect in `next.config.ts` `redirects()`:

| Old URL                              | Redirects to     |
| ------------------------------------ | ---------------- |
| `/index.html`, `/everest-kosove/`    | `/`              |
| `/about.html`                        | `/`              |
| `/contact.html`                      | `/#home-contact` |
| `/certificate.html`, `/everest.pdf`  | `/dokumentet`    |
| `/blog-home.html`, `/blog-post.html` | `/njohuri`       |

`/faq.html`, `/portfolio-overview.html`, `/portfolio-item.html` and `/llms.txt` deliberately return 404 until a matching page ships (for
example, point the portfolio URLs at the projects gallery once it is public). Never redirect a URL
to an unrelated page: Google treats that as a soft 404.

## 7. Performance (ranking and UX)

Targets measured on mobile (4G, mid-range Android) at the 75th percentile: **LCP < 2.5s,
INP < 200ms, CLS < 0.1**.

- Static rendering by default (`generateStaticParams` + `setRequestLocale`).
- One self-hosted variable font with `display: swap`. No third-party font requests.
- Client JavaScript only where interaction requires it. Only the needed message namespaces are
  sent to the browser.
- Images via `next/image` with dimensions. The LCP image (when one exists) gets `preload`.
- No third-party scripts (analytics, chat, maps) without a documented decision covering
  performance and privacy.
- **Decision (owner, 2026-10-30): Google Maps embed** in the home contact section
  (`siteConfig.address.mapEmbedUrl`). Performance: an `<iframe loading="lazy">` at the bottom of
  the page, so Google's code loads only when the contact section nears the viewport and never
  affects LCP. Privacy: Google receives the visitor's IP and may set cookies once the frame
  loads. Revisit with a click-to-load placeholder if a cookie-consent requirement applies.
