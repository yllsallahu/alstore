# Design rules

Tokens live in `src/styles/tokens.css`. That file and this document must change together.

## 1. Direction

**Architectural and industrial, quiet and exact.** The references are building-product
literature and architectural drawings, not SaaS dashboards:

- Warm plaster-white paper, graphite ink, one anodised-bronze accent.
- Typography leads. Large semi-expanded headings and a measured reading column.
- Hairline rules and a 12-column grid instead of cards, shadows and gradients.
- Near-square corners (2–4px). Aluminium profiles have crisp edges.
- Generous vertical rhythm (`py-section`). Content gets room.

**Do not build:** dashboard layouts, KPI tiles, rounded "card soup", drop shadows, glassmorphism,
gradient blobs, emoji icons, stock-photo heroes, carousels that auto-advance, or decorative
illustrations standing in for real product imagery.

## 2. Colour tokens

The palette is **provisional** until the official brand files arrive. It is a neutral base chosen
to sit under any logo. When brand colours are confirmed, change the values in `tokens.css`; keep
the names. Tailwind's default palette is reset (`--color-*: initial`), so only these exist.

| Token               | Hex (approx.) | Use                                       | Contrast                                    |
| ------------------- | ------------- | ----------------------------------------- | ------------------------------------------- |
| `paper`             | `#faf9f6`     | Page background                           | n/a                                         |
| `paper-sunken`      | `#f1efeb`     | Inset bands, stripes                      | n/a                                         |
| `graphite`          | `#1c1e22`     | Dark bands (footer)                       | n/a                                         |
| `ink`               | `#181b1e`     | Body text, primary buttons                | 16.4:1 on paper                             |
| `ink-hover`         | `#32363b`     | Hover for ink-filled buttons              | paper text 11.6:1                           |
| `ink-muted`         | `#52565b`     | Secondary text                            | 7.1:1 on paper, 6.5:1 on sunken             |
| `on-graphite`       | `#f5f3f0`     | Text on graphite                          | 15.1:1                                      |
| `on-graphite-muted` | `#aeb1b6`     | Secondary text on graphite                | 7.8:1                                       |
| `line`              | `#dad9d5`     | Hairlines/dividers (decorative)           | n/a                                         |
| `line-strong`       | `#84868a`     | Input borders, outlined buttons           | 3.5:1 on paper (UI ≥ 3:1)                   |
| `line-inverse`      | `#3f4348`     | Hairlines on graphite                     | n/a                                         |
| `accent`            | `#b17843`     | Rules, markers, active underline          | 3.6:1, **not for body text**                |
| `accent-ink`        | `#7d4e24`     | Accent-coloured text on paper             | 6.7:1                                       |
| `brand`             | `#001a55`     | Logo navy: product-category accents       | 15:1 on paper                               |
| `everest`           | `#ffef10`     | "EVEREST" in the home hero (owner choice) | 14:1 on graphite, **dark backgrounds only** |
| `focus`             | `#1467c2`     | Focus outline                             | 5.3:1 on paper                              |
| `danger`            | `#b02b27`     | Validation errors                         | 6.2:1 on paper                              |

Rules: body text ≥ 4.5:1, large text and UI boundaries ≥ 3:1. Colour is never the only signal
(errors also get text, active states also get an underline).

## 3. Typography

- **Family:** Archivo variable (wght 100–900, wdth 62–125), self-hosted from
  `src/styles/fonts/`. It is licensed under SIL OFL 1.1 and covers ë, ç, Ë, Ç and €. One file
  serves the whole site.
- **Headings:** `font-semibold font-stretch-semi-expanded`, `text-balance`.
- **Body:** default width, `text-base` / `text-lg` for leads, `text-pretty`, max `max-w-measure` (42rem).
- **Labels:** the `<Eyebrow>` component: uppercase, `tracking-label` (0.14em), bronze rule.
- **Numbers:** `tabular-nums` for phone numbers, series codes and dimensions.

Scale (`--text-*` reset; only these exist): `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`,
`display`. `xl` and above are fluid (`clamp`). Use `display` once per page (the H1 on landing
pages) and `3xl` for page titles elsewhere.

## 4. Layout and space

- `Container` (`max-w-site` = 84rem, `px-gutter` = clamp 1.25–3rem) wraps every full-width band.
- `py-section` (clamp 4–9rem) separates major sections. Smaller gaps use the default 0.25rem
  spacing scale. `h-preview` (36rem) is the technical-document preview pane from `lg` up;
  below that the pane uses `h-96`.
- 12-column grid at `md`+. Single column below `md`. Design mobile-first at 360px width.
- Touch targets ≥ 44px (`min-h-11`). Primary actions are 48px (`min-h-12`).
- Breakpoints are Tailwind defaults (`sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem).

## 5. Shape and motion

- Radius tokens: `rounded-sm` (2px) and `rounded-md` (4px) only. `rounded-full` is allowed for
  true circles.
- Shadows are reset (`--shadow-*: initial`). Separate surfaces with lines and background tones.
- Motion: `duration-200 ease-standard`, colour and opacity only. Nothing moves on its own, with
  one owner-requested exception: the muted, looping home hero video (§8). It is hidden under
  `prefers-reduced-motion`, leaving its still poster. `prefers-reduced-motion` is honoured globally.

## 6. Component conventions

- **Server Components by default.** A Client Component starts with `"use client"` and a comment
  saying why. Current Client Components: `LocaleSwitcher` (needs pathname), `MobileNav` (menu
  state), `HeaderFrame` (pathname + scroll position), `ProductCategories` (selected category
  image), `DocumentViewer` (selected technical document) and `error.tsx` / `global-error.tsx`
  (Next.js requirement).
- **Header over the hero:** on the home page `HeaderFrame` sets `data-overlay` on the header
  while the full-screen hero is behind it: transparent background, `on-graphite` text, and the
  primary wordmark rendered white with a CSS filter (no inverse logo file exists yet). Header
  children opt in with `group-data-overlay/header:` utilities. Past the hero it is solid `paper`.
- **Locations:** shared primitives go in `src/components/ui/`, site chrome in
  `src/components/layout/`, the identity slot in `src/components/brand/` and SEO renderers in
  `src/components/seo/`. Feature UI goes in `src/features/<feature>/components/` (from Phase 2).
- **One style, many elements:** action styling is the `buttonClasses(variant)` function, used on
  `<button>`, `<a>` and the localized `<Link>`. Don't create `Button`/`ButtonLink` wrappers
  unless a real behavioural need appears.
- **No class-merging library.** `cx()` only joins strings. Don't pass conflicting utilities.
  Expose a prop (e.g. `tone`) instead.
- **No arbitrary values** (`text-[13px]`, `bg-[#…]`). If a value is needed twice, it becomes a
  token.
- **All copy goes through next-intl.** No hard-coded user-facing strings except the bilingual
  root fallbacks (`app/not-found.tsx`, `app/global-error.tsx`).

## 7. Brand assets

The owner supplied a transparent wordmark for light backgrounds (published as
`public/brand/alstore-logo.webp`, registered as `logo.primary`; PNG source kept beside it).
Photography, brand guidelines, the inverse logo, the Open Graph image and icons **have not been
delivered**. Do not draw, generate, trace or approximate a logo. Do not use the other PNG
candidates found in git history (see `CONTENT_SOURCES.md`).

**How it works now:** `src/config/brand.ts` is a typed registry. `<BrandMark>` renders the logo
when that tone's slot is filled; otherwise it renders the words "AL STORE" in the site typeface.
That fallback is plain text, not a logo design. The footer still uses the text fallback because
the supplied wordmark is dark and has no inverse version.

**When the files arrive**, place them in `public/brand/` with these names and fill the registry:

| File                                    | Registry slot          | Notes                                 |
| --------------------------------------- | ---------------------- | ------------------------------------- |
| `public/brand/alstore-logo.webp`        | `logo.primary`         | Supplied. Light backgrounds (header). |
| `public/brand/alstore-logo-inverse.svg` | `logo.inverse`         | For graphite backgrounds (footer)     |
| `public/brand/og-default.png`           | `ogImage`              | 1200×630 social share image           |
| `src/app/icon.svg` or `icon.png`        | (Next file convention) | Favicon, auto-detected by Next.js     |
| `src/app/apple-icon.png`                | (Next file convention) | 180×180 touch icon                    |

Then set `{ src, width, height }` from the file's viewBox or pixel size. Header, footer, Open
Graph and JSON-LD `logo` pick them up with no component changes. If the brand guidelines specify
colours, update the colour tokens in `tokens.css` at the same time.

## 8. Imagery

- Only owner-supplied photographs, or EVEREST material with written permission recorded in
  `CONTENT_SOURCES.md`.
- No stock imagery standing in for real projects or products. No AI-generated product photos.
- **EVEREST system renders** (homepage Systems section) are self-hosted WebP under
  `public/media/systems/` and served through `next/image` (AVIF when the client supports it).
  They sit on `paper-sunken` with `mix-blend-multiply`, so their white backgrounds take the panel
  tone. The section is a hairline grid, not shadowed cards. Lazy-load below the fold.
- Always use `next/image` with explicit dimensions and meaningful `alt` text in both languages.
  Purely decorative backgrounds (the hero video and its poster) use `alt=""` / `aria-hidden`.
- **Home hero:** LCP is the poster `public/media/hero-video-poster.webp` (`priority` +
  `fetchPriority="high"`). The MP4 (`public/media/hero-video.mp4`, ~640×360, ~430 KB) is
  idle-loaded by `DeferredHeroVideo` and skipped on reduced motion / save-data / 2G. Behind a
  `graphite/60` scrim so `on-graphite` text stays readable.

## 9. Accessibility baseline

WCAG 2.2 AA. Every page has a skip link, one `h1`, logical heading order, visible focus
(`focus` token outline) and `lang` on `<html>` (plus on inline foreign-language text). It must be
usable at 360px and at 200% zoom.
