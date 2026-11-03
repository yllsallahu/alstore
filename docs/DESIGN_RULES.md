# Design rules

Tokens live in `src/styles/tokens.css`. That file and this document must change together.

## 1. Direction

**Premium architectural minimalism, image-led** (owner brief, 2026-11-03: "less text, more
visual storytelling, more whitespace"). The references are high-end architectural studios and
European building-product brands, not SaaS dashboards:

- Photography drives each section. Large, cinematic images (21:9 bands, full-bleed hero,
  image-first cards); text is short: headings of 3–7 words and one supporting line.
- Warm plaster-white paper, graphite ink, one anodised-bronze accent.
- Large **light-weight** (`font-light`) semi-expanded headlines; body stays regular weight.
- Hairline rules and a 12-column grid with deliberate asymmetry, instead of shadows and boxes.
- Near-square corners (2–4px). Aluminium profiles have crisp edges.
- Generous vertical rhythm (`py-section`). Content gets room.
- Long technical content (specs, documents, articles) lives on inner pages, not the homepage.

**Do not build:** dashboard layouts, KPI tiles, rounded "card soup", drop shadows, glassmorphism,
gradient blobs, emoji icons, carousels that auto-advance, or decorative illustrations standing in
for real product imagery.

## 2. Colour tokens

The palette is **provisional** until the official brand files arrive. It is a neutral base chosen
to sit under any logo. When brand colours are confirmed, change the values in `tokens.css`; keep
the names. Tailwind's default palette is reset (`--color-*: initial`), so only these exist.

| Token               | Hex (approx.) | Use                                       | Contrast                                    |
| ------------------- | ------------- | ----------------------------------------- | ------------------------------------------- |
| `paper`             | `#faf9f6`     | Page background                           | n/a                                         |
| `paper-sunken`      | `#f1efeb`     | Inset bands, stripes                      | n/a                                         |
| `stone`             | `#e2dfda`     | Image wells while a photograph loads      | n/a                                         |
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
`display`, `statement`, `hero`. `xl` and above are fluid (`clamp`).

- `hero` (3–9.5rem): the home H1 only.
- `display`: the H1 of inner pages (`PageHero`, system pages).
- `statement` (1.9–4.25rem): large typographic statements (brand statement, engineering band,
  closing call to action). At most two per page.
- `3xl`: section headings. Large sizes use `font-light`; `max-w-headline` (22ch) caps their line
  length.

## 4. Layout and space

- `Container` (`max-w-site` = 84rem, `px-gutter` = clamp 1.25–3rem) wraps every full-width band.
  Cinematic photographs may go wider: `max-w-wide` (120rem) inside a `px-gutter` wrapper.
- `py-section` (clamp 4–9rem) separates major sections. Smaller gaps use the default 0.25rem
  spacing scale. `h-preview` (36rem) is the technical-document preview pane from `lg` up;
  below that the pane uses `h-96`. `min-h-fold` (`100svh` minus the 5rem sticky header) makes a
  band fill exactly one screen under the header; the home company story uses it from `lg` up.
- 12-column grid at `md`+. Single column below `md`. Design mobile-first at 360px width.
- Touch targets ≥ 44px (`min-h-11`). Primary actions are 48px (`min-h-12`).
- Breakpoints are Tailwind defaults (`sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem).

## 5. Shape and motion

- Radius tokens: `rounded-sm` (2px) and `rounded-md` (4px) only. `rounded-full` is allowed for
  true circles.
- Shadows are reset (`--shadow-*: initial`). Separate surfaces with lines and background tones.
- Motion is subtle. Owner brief (2026-11-03): "the website should be full of videos, animations
  and photos". Loops are therefore allowed only as **ambient video** (`<AmbientVideo>`: muted,
  captionless, `aria-hidden`, poster underneath) in the slots listed in §8; UI elements never
  loop. CSS transitions and keyframes for everything else; the one animation library is gsap,
  used only by the truck story (`TruckScrollHero`). `prefers-reduced-motion` is honoured
  globally and every animation also carries `motion-reduce:*-none`.
- UI feedback: `duration-200`/`300 ease-standard` (colour, underline, arrow nudge
  `group-hover:translate-x-1`).
- Page entrances: hero copy fades in and rises 1rem, once on load, 900ms `ease-out-soft`,
  staggered 120ms (`animate-rise` … `-4`). The hero / page-header photograph settles from a 1.08
  zoom (`animate-settle`, 2.4s). Used only by `HomeHero` and `PageHero`.
- Scroll reveals: wrap a section in `<Reveal>` and give children `revealItem` (rise 2rem + fade,
  1s `ease-out-soft`) or `revealImage` (settle from 1.1 zoom) from
  `src/components/ui/reveal-classes.ts`, staggered with `revealDelays`. Content above the fold is
  never hidden, and nothing is hidden without JavaScript.
- Truck story (home): the section pins for 160% of the viewport while the EVEREST truck crosses
  the screen and the copy hands over (gsap ScrollTrigger, scrubbed). Reduced motion gets the
  static, unpinned layout.
- Films never autoplay with sound. `FilmPlayer` shows the poster and a round play button; the
  film loads and starts only on press, with native controls.
- Image hover: photographs in links zoom to `scale-105` over 1s `ease-out-soft`.

## 6. Component conventions

- **Server Components by default.** A Client Component starts with `"use client"` and a comment
  saying why. Current Client Components: `LocaleSwitcher` (needs pathname), `PrimaryNav` (current-page
  marker: pathname), `MobileNav` (menu
  state), `HeaderFrame` (pathname + scroll position), `Reveal` (scroll-in
  reveal of server-rendered content), `DocumentLibrary` (document filters and dialog), `SystemCompare` (selected
  systems), `TruckScrollHero` (gsap scroll scrub), `FilmPlayer` (click-to-load film) and
  `error.tsx` / `global-error.tsx`
  (Next.js requirement).
- **Header over the hero:** on the home, films, documents and system pages (each opens with a dark hero
  pulled up under the bar with `-mt-16 sm:-mt-20`) `HeaderFrame` sets `data-overlay` on the header
  while the full-screen hero photograph is behind it: transparent background, `on-graphite` text, and the
  primary wordmark rendered white with a CSS filter (no inverse logo file exists yet). Header
  children opt in with `group-data-overlay/header:` utilities. Past the hero it is solid `paper`.
- **Locations:** shared primitives go in `src/components/ui/`, site chrome in
  `src/components/layout/`, the identity slot in `src/components/brand/` and SEO renderers in
  `src/components/seo/`. Feature UI goes in `src/features/<feature>/components/` (from Phase 2).
- **One style, many elements:** action styling is the `buttonClasses(variant)` function, used on
  `<button>`, `<a>` and the localized `<Link>`. Don't create `Button`/`ButtonLink` wrappers
  unless a real behavioural need appears. Variants: `primary` and `secondary` on paper;
  `primaryInverse` (`on-graphite` fill, `ink` text) and `secondaryInverse` (`on-graphite-muted`
  border) on graphite or a photograph scrim. Sizes: `md` (48px, default) and `sm` (44px, header
  bar), passed as the third argument. Buttons are sentence case, `font-medium`.
- **Photographs:** `<Photo name="…" sizes="…">` from `src/components/ui/photo.tsx`, inside a
  `relative` parent with an aspect ratio and `bg-stone`. Image cards put the label over a
  bottom `graphite` scrim, with a round arrow that fills on hover.
- **Page openings and closings:** inner pages start with `PageHero` (eyebrow, light `display`
  H1, lead, optional 21:9 photograph) and the home and About pages end with `ClosingCta`.
- **No class-merging library.** `cx()` only joins strings. Don't pass conflicting utilities.
  Expose a prop (e.g. `tone`) instead.
- **No arbitrary values** (`text-[13px]`, `bg-[#…]`). If a value is needed twice, it becomes a
  token.
- **All copy goes through next-intl.** No hard-coded user-facing strings except the bilingual
  root fallbacks (`app/not-found.tsx`, `app/global-error.tsx`).

## 7. Brand assets

The owner supplied a transparent wordmark for light backgrounds (`public/brand/alstore-logo.png`,
registered as `logo.primary`). AL STORE's own photography, brand guidelines, the inverse logo, the Open Graph
image and icons **have not been delivered**. Do not draw, generate, trace or approximate a logo.
Do not use the other PNG candidates found in git history (see `CONTENT_SOURCES.md`).

**How it works now:** `src/config/brand.ts` is a typed registry. `<BrandMark>` renders the logo
when that tone's slot is filled; otherwise it renders the words "AL STORE" in the site typeface.
That fallback is plain text, not a logo design. The footer renders the supplied wordmark white
with a CSS filter (`brightness-0 invert`), as the header does over the hero, until an inverse file
exists.

**When the files arrive**, place them in `public/brand/` with these names and fill the registry:

| File                                    | Registry slot          | Notes                                 |
| --------------------------------------- | ---------------------- | ------------------------------------- |
| `public/brand/alstore-logo.png`         | `logo.primary`         | Supplied. Light backgrounds (header). |
| `public/brand/alstore-logo-inverse.svg` | `logo.inverse`         | For graphite backgrounds (footer)     |
| `public/brand/og-default.png`           | `ogImage`              | 1200×630 social share image           |
| `src/app/icon.svg` or `icon.png`        | (Next file convention) | Favicon, auto-detected by Next.js     |
| `src/app/apple-icon.png`                | (Next file convention) | 180×180 touch icon                    |

Then set `{ src, width, height }` from the file's viewBox or pixel size. Header, footer, Open
Graph and JSON-LD `logo` pick them up with no component changes. If the brand guidelines specify
colours, update the colour tokens in `tokens.css` at the same time.

## 8. Imagery

- Only owner-supplied photographs, EVEREST material the owner supplied, or free Unsplash
  photographs the owner asked for (2026-11-03), each recorded in `CONTENT_SOURCES.md` (§4 "Site
  photography"). Unsplash photographs are generic architecture: never tied to a product or series.
- EVEREST catalogue photography is **illustrative**: never captioned as an AL STORE project, and
  tied to a series only where the EVEREST catalogue itself does (the 70 000 / 71 000 system pages,
  captioned "EVEREST systems catalogue 2024"). The footer carries the general photo credit.
- No imagery standing in for real projects or products. No AI-generated imagery (check every
  Unsplash candidate at full size; prefer camera originals).
- Scrims: photographs behind text get a `graphite` gradient (`bg-linear-to-t` / `-to-r`) strong
  enough for `on-graphite` text (never lighter than `graphite/55` under the overlaid header). These
  functional scrims are the only gradients allowed.
- **EVEREST system renders** (homepage Systems section) load from `everest.al` via `next/image`
  `remotePatterns`. They sit on `paper-sunken` with `mix-blend-multiply`, so their white
  backgrounds take the panel tone. The section is a hairline grid, not shadowed cards.
- **Explanatory diagrams** (knowledge centre, `ArticleFigure`): original inline SVG schematics
  drawn with colour tokens (`fill-paper-sunken`, `stroke-ink`, `fill-accent`). They are labelled
  "illustrative" in the caption, never imitate a manufacturer drawing, and carry meaning through
  a numbered text legend (the SVG itself is `aria-hidden`).
- Always use `next/image` with explicit dimensions and meaningful `alt` text in both languages.
  Purely decorative backgrounds (the hero video and its poster) use `alt=""` / `aria-hidden`.
- **Home hero:** a full-screen photograph (`duskHouse`) behind a bottom-to-top scrim
  (`graphite/90` → `/25` → `/55`).
- **Ambient loops** (`src/config/media.ts`, 6–10 s, native 1080p, no sound): `profile91000`
  (home engineering band), `villa93000` (films page header), `facade30000` (compare page header),
  `interior93000` (About band, `FilmBand`).
- **Sharpness rule (owner, 2026-11-03):** no soft or upscaled image anywhere. A photograph's
  source must be at least as wide, in device pixels at 2×, as the slot it fills, or the slot is
  made smaller (system pages frame their catalogue photo at half width for this reason).
  Full-bleed slots use Unsplash originals (3200 px) or native 1080p film material. Cut from EVEREST technical films with logos and caption bars cropped out.
- **Technical films** (`/video`): EVEREST's own films per series, shown complete with their
  EVEREST branding and credited as EVEREST's. Landscape films sit in 16:9 wells, the portrait
  PVC film in a 9:14 well. On the homepage, one featured film plays in place and the rest are
  poster tiles linking to their chapter.
- **Document covers** (system pages; the documents page uses the same treatment in
  `DocumentLibrary`, whose cards open a dialog with facts and the full PDF): `DocumentCard` shows the real first
  page of a document in a tinted 3:4 well; it lifts 0.5rem on hover and always opens the full
  document. Covers are never cropped, retouched or used without the link.

## 9. Accessibility baseline

WCAG 2.2 AA. Every page has a skip link, one `h1`, logical heading order, visible focus
(`focus` token outline) and `lang` on `<html>` (plus on inline foreign-language text). It must be
usable at 360px and at 200% zoom.
