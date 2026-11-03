# Content sources and provenance

Every fact, text and asset published on the site must trace back to an entry here. If it is not
listed as **verified**, it does not go on the site.

## 1. Verified facts

| Fact              | Value                                     | Source                     | Date       |
| ----------------- | ----------------------------------------- | -------------------------- | ---------- |
| Business name     | AL STORE                                  | Owner brief (Phase 1 spec) | 2026-10-19 |
| Relationship      | Distributor of EVEREST products           | Owner brief                | 2026-10-19 |
| Address           | Isa Boletini, Radivojc 61000, Kosovo      | Owner brief                | 2026-10-19 |
| Map location      | https://maps.app.goo.gl/5uWMXwRzHL4Tz1Hd7 | Owner (chat)               | 2026-10-30 |
| Phone             | +383 44 177 351                           | Owner brief                | 2026-10-19 |
| Email             | alstore.shpk@gmail.com                    | Owner brief                | 2026-10-19 |
| Domain            | https://www.alstore-ks.com/               | Owner brief                | 2026-10-19 |
| Manufacturer site | https://everest.al/                       | Owner brief                | 2026-10-19 |
| Languages         | Albanian, English                         | Owner brief                | 2026-10-19 |
| Website type      | B2B catalogue + quotation requests        | Owner brief                | 2026-10-19 |
| Supply 2018–2026  | 8+ years partnership with EVEREST         | Owner (chat), cumulative   | 2026-10-21 |
| Supply 2018–2026  | 100+ supply trucks                        | Owner (chat), cumulative   | 2026-10-21 |
| Supply 2018–2026  | 120+ tonnes of aluminium supplied         | Owner (chat), cumulative   | 2026-10-21 |
| Distributor since | 2018 (EVEREST partner since 2018)         | Owner (chat)               | 2026-10-25 |

**Truck figures:** on 2026-10-25 the owner asked to treat 100+ trucks and 120+ tonnes as unverified
until confirmed. On 2026-11-03 the owner asked for the truck animation back: `TruckScrollHero`
is restored on the homepage with **only** the verified "8+ years" figure. The truck and tonnage
counts stay unpublished until the owner confirms them; then add them to `siteConfig.supplyStats`
and `TruckScrollHero.stats`.

**Company story (About page since 2026-11-03; homepage before):** `src/features/about/company-story.ts`. AL STORE rows: the
2018 start and "8+ years" above. EVEREST rows: 2018 uPVC entry from https://everest.al/about-us/
(read 2026-10-25), then RP2147, RP2176, RP2790, EPD-IES-0026335 and ASI 554 from §5, with the year
read from the document register. Pre-2018 EVEREST milestones (1997, 2000, 2005) were removed with the
old EVEREST-only timeline.

**Not published:** "all products certified to European ISO standards" (owner statement in chat,
2026-10-20). It was removed from the site on 2026-10-20 as unverified. Add the certificate,
standard number and issuing body here before any certification claim returns.

## 2. Conflicts found in repository history (owner to resolve)

The previous static site (commits up to `278cf00`, removed in `c3841d8`) published different
details. **The owner brief wins.** These are listed so nobody copies the old values by accident:

| Item                 | Old site value                                 | Current (verified)       |
| -------------------- | ---------------------------------------------- | ------------------------ |
| Postal code          | `Radivojc 6000`                                | `Radivojc 61000`         |
| Address detail       | "Magjistralja Gjilan–Ferizaj"                  | not in brief: don't use  |
| Second phone         | `+383 49 177 351`                              | not in brief: don't use  |
| Email                | `everest.kllokot@outlook.com`                  | `alstore.shpk@gmail.com` |
| Relationship wording | "partneri zyrtar i Everest Construction Group" | "distributor" only       |

**Open question for the owner:** should the second phone number or the road description
("Magjistralja Gjilan–Ferizaj") be added? Until confirmed, they stay off the site.

## 3. Unverified claims from the old site (do not reuse)

From the old `llms.txt` and pages: "Everest produces aluminium profiles since 1997", "10-year
warranty", "ASI, EPD, Passive House certifications (EV 67 000)", "consulting and installation
across Kosovo", product series lists (70 000, 71 000, 74 000, 91 000, 92 000, 93 000, 30 000,
33 000, 85 000). These may be true, but they are manufacturer or service claims with no recorded
source. They must be re-verified against current EVEREST documentation, or confirmed by the owner,
before any of them appear. Sample results that are now published are limited to §5. A result
for one tested sample is not a result for its series, and not a result for Aluminium or PVC as a
category.

## 4. Brand assets

| Asset                      | Status            | Notes                                                                                                                                                                                                                        |
| -------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official AL STORE logo     | **Partial**       | Owner supplied `images/logo without bg.png` (2026-10-20). Cropped transparent wordmark is `public/brand/alstore-logo.png`, registered as `logo.primary` (header). `logo.inverse` is still null                               |
| Brand colours / guidelines | **Not delivered** | Tokens are provisional (DESIGN_RULES §2)                                                                                                                                                                                     |
| Photography                | **Partial**       | No AL STORE photography yet. Illustrative EVEREST and Unsplash photography is in use (see "Site photography" below)                                                                                                          |
| Home hero video            | **Retired**       | Owner supplied `images/Untitled design.mp4` (2026-10-20). Removed from the site on 2026-11-03 (848×478, too soft at full width); the About band now uses a 1080p loop from the EVEREST 93 000 film. Location never confirmed |
| Open Graph image           | **Not delivered** | `ogImage` = null                                                                                                                                                                                                             |
| Favicon / app icons        | **Not delivered** | No icon is shipped; browsers show the default                                                                                                                                                                                |

### Site photography (2026-11-03)

On 2026-11-03 the owner added the folder `6. Videot teknike/` (EVEREST catalogues, technical
videos and certificates) to the project and asked for its photos and pictures to be used in the
visual redesign. That instruction is the permission on record; EVEREST's written consent is still
to be filed, as for the system renders in §5. Files live in `src/assets/photography/`, registered in
`src/config/photography.ts`:

| File                  | Source                                                                  | Where it is used                 |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `glass-pavilion.jpg`  | `Everest systems catalog 2024.pdf`, p. 30, left photograph              | About page header                |
| `glass-tower.jpg`     | catalogue p. 9, left                                                    | Technical resources header       |
| `series-70000.jpg`    | catalogue p. 18 ("70 000 SERIES"), left, top trimmed                    | 70 000 system page               |
| `series-71000.jpg`    | catalogue p. 20 ("71 000 SERIES"), right                                | 71 000 system page               |
| `profile-section.jpg` | `91 000 slide system.mp4`, native 1080p still at 0:48, logo and bar cut | Knowledge centre header          |
| `profile-gasket.jpg`  | `91 000 slide system.mp4`, native 1080p still at 0:46, logo and bar cut | Technical resources: how to read |

**Sharpness pass (owner, 2026-11-03: "all photos high quality, not blurry; if one is blurry remove
it or use a similar photo from the internet").** The catalogue PDF holds each page as one
compressed 300 ppi scan, so its crops are soft when shown full-width. Removed: `villa-dusk`,
`lake-view`, `window-seat`, `sea-slide`, `pvc-window`, `timber-house`, `forest-house` and the
848×478 factory clip (`hero-video.mp4` + poster). The two series photographs stay because the
catalogue ties them to their series; system pages now show them framed at half width, where they
are sharp. Video stills were re-cut from the 1080p source films without upscaling.

Replacements are free photographs from **Unsplash** (Unsplash License: free commercial use, no
attribution required, not to be sold unaltered or used to build a competing service; Unsplash+
images excluded). Each was checked at full resolution (camera originals, 3.7k–6.7k px wide) and
none is AI-generated. They are generic architecture, **illustrative only**: never captioned as an
EVEREST product, a specific series or an AL STORE project. Hotlinked from images.unsplash.com
(`next.config.ts` remotePatterns, exact query string), registered in `src/config/photography.ts`:

| Key             | Unsplash image                     | Photographer (where listed) | Where it is used                   |
| --------------- | ---------------------------------- | --------------------------- | ---------------------------------- |
| `duskHouse`     | `photo-1600585154340-be6161a56a0c` |                             | Home hero                          |
| `livingRoom`    | `photo-1600607687939-ce8a6c25118c` |                             | Home brand statement               |
| `kitchenWindow` | `photo-1662624915046-02d9d4ee724d` | Jessica Hearn               | Home collection: windows and doors |
| `seaSlide`      | `photo-1565261949232-3fcc78206c0c` | Adam Elwan                  | Home collection: sliding systems   |
| `whiteWindow`   | `photo-1496092607007-ca127e0b6a10` | Nathan Fertig               | Home collection: PVC               |
| `timberFacade`  | `photo-1600566753190-17f0baa2a6c3` |                             | Home about teaser                  |
| `poolVilla`     | `photo-1613490493576-7fde63acd811` |                             | Closing call to action             |

The footer credits "EVEREST … and Unsplash". To move off hotlinking, download the same IDs at
3200 px into `src/assets/photography/` and switch the entries to static imports.

**Technical films and loops (2026-11-03):** the owner asked for "the technical videos for the
specific series" from the same folder. Published in `public/media/films/` (re-encoded to 720p
H.264, otherwise unaltered, EVEREST branding kept, credited as EVEREST's):

| File                    | Source in "6. Videot teknike"       | Series / what it shows              |
| ----------------------- | ----------------------------------- | ----------------------------------- |
| `everest-93000.mp4`     | `Everest 93 000 minimal Slide.mp4`  | 93 000 minimal slide                |
| `everest-91000.mp4`     | `91 000 slide system.mp4`           | 91 000 slide                        |
| `everest-92000.mp4`     | `Everest 92 000 List and Slide.mp4` | 92 000 lift and slide               |
| `everest-30000.mp4`     | `Seria 30 000 1.mp4`                | 30 000 curtain wall assembly        |
| `everest-85000-pvc.mp4` | `Everest PVC_Aluclip.mp4`           | 85 000 PVC (the film's own caption) |

Each `-poster.jpg` is a frame of its film. Series names and categories are the ones printed in
each film; descriptions say only what the film shows; no technical value is taken from a film.
Ambient loops in `public/media/loops/` are 6–10 s native-1080p cuts of the 93 000, 91 000 and 30 000 films
with logos and caption bars cropped out (times in `src/config/media.ts`). Still **not used**:
`Pergola 1/2`, `Gyotine`, `Everest Longboard` (products not confirmed as AL STORE's) and
`Seria 91 000 1.mp4` (a shorter cut of the 91 000 film).

**Document covers (2026-11-03):** `src/assets/documents/<id>.jpg` is page 1 of each registered
document, rendered unaltered from the same complete PDF (IRCCOS files from `public/documents/`;
ASI 554, EPD-IES-0026335/0026336 and Passive House 2570ws04 from the owner's `certificates/`
copies of the official files). A cover is a preview of the whole document and always links to
it, so it is not a partial reproduction published in place of the report.

Rules for these files:

- They are **illustrative**: EVEREST catalogue photography and renders, not AL STORE projects. They
  are never captioned or described as projects AL STORE supplied. The footer credits them.
- Only `series-70000.jpg` and `series-71000.jpg` are shown next to a series, because the EVEREST
  catalogue itself prints them on that series' page; they carry the caption "EVEREST systems
  catalogue 2024". No other photograph is presented as a specific product model.
- EVEREST logos and caption bars were cropped out of video stills; nothing else was retouched.
- **Not used:** `images/main page.png` (appears AI-generated: distorted machinery), the
  `Pergola`, `Gyotine` and `Longboard` videos (products not verified as AL STORE's), and the
  `Prezantimi Share Architects 2026.pdf` reference projects (third-party projects, no consent).

**Deleted from the project folder (owner request, 2026-11-03):** `images/alumin.jpg`,
`images/pvc.jpg`, `images/main page.png`, `images/Untitled design.mp4` (all unused) and the
duplicate `certificates/EVEREST_Certifikata_dhe_Raporte_AL_STORE (1).zip`. They remain in git
history; the notes above that name them are kept as the record of why they were not used.

**Candidates found in git history, NOT approved and NOT used:**

- `images/alstoreeee-removebg-preview.png`: looks like a background-removed logo export.
  Quality and authority unknown. The owner must supply the official vector file instead.
- `assets/favicon.ico`: origin unknown.
- `images/everest.png`, `images/everest-pvc-85000.jpg`, `images/crealco-elite-slider.png`:
  manufacturer or third-party imagery with no recorded permission.
- `images/*.jpg` named after people or businesses (e.g. `alikuq.jpg`, `prokami.jpg`,
  `eurogjilan.png`): appear to be client or partner logos. Do not publish client names or logos
  without written consent.
- `everest.pdf` (committed as "certificate"): EVEREST document of unknown type and date. Treat
  it as manufacturer material and get confirmation before linking or extracting from it.

## 5. EVEREST product information (for later phases)

**Homepage categories (owner request, 2026-10-20):** Aluminium, PVC and Accessories. They are
entry points only, with no products or availability.

- **Image:** owner-supplied transparent render `images/9457114deb8d49c7b20bcd36.png` (714×700,
  2026-10-20), published as `public/media/categories/window.png` and shown for every category.
  Original author not recorded; confirm usage rights with the owner.
- **Rejected as too blurry (owner, 2026-10-20):** `images/alumin.jpg` and `images/pvc.jpg`
  (300×250). Per-category images need sharp files at least ~1000px wide.
- **Copy (owner asked to use everest.al, read 2026-10-20):** aluminium and PVC descriptions and
  tags are paraphrased from https://everest.al/sq/alumin/, https://everest.al/sq/pvc/ and
  https://everest.al/sq/alumin/produktet/ (system types only, no series or values).
- **Not used from everest.al:** warranty (the English page says 100 years, the Albanian page 10),
  "since 1997", awards and certificates. Resolve with the owner before publishing any of them.
- **Accessories:** everest.al has no accessories category. The copy stays generic (no items named).
  No certificate is attached to Accessories.

**Homepage "Systems" section (owner request, 2026-10-25):** `src/features/catalog/systems.ts`,
wording in `Systems.*`. The owner named the sources and asked for EVEREST's official photos.

| System          | Official page (read 2026-10-25)                            | Image                                                             | Status                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 000 Standard | https://everest.al/aluminium-full/products/30000-standard/ | `everest.al/wp-content/uploads/2020/04/30000-standard-series.jpg` | **Pending.** The page shows only images (no public text), and the series is not in the aluminium product list. Copy says "aluminium system" only                                       |
| 60 000 Series   | https://everest.al/aluminium-full/products/60000-series/   | `…/2020/04/sistemi-60000.jpg`                                     | Listed as Tilt & Turn, Windows/Doors. Copy paraphrased                                                                                                                                 |
| 70 000 Series   | https://everest.al/aluminium-full/products/70000-series/   | `…/2020/04/70000-series.jpg`                                      | Listed as Tilt & Turn, Windows/Doors. Copy paraphrased                                                                                                                                 |
| 71 000 Series   | https://everest.al/aluminium-full/products/71000-series/   | `…/2020/04/71000-series.jpg`                                      | Listed as Tilt & Turn, Windows/Doors. Copy paraphrased                                                                                                                                 |
| 76 000 Series   | https://everest.al/aluminium-full/products/76000-series/   | `…/2020/04/76000-series.jpg`                                      | **Pending.** Only the product-list excerpt is readable. EVEREST lists 76 000 under **Aluminium**, while RP2549 (below) calls a 76 000 series PVC. Owner to confirm before linking them |
| PVC (category)  | https://everest.al/pvc-full/                               | `public/media/categories/window.png` (same EVEREST uPVC render)   | Category card, no series named                                                                                                                                                         |

- On 2026-10-25 every EVEREST product page above returned HTTP 500 ("critical error") with only
  images rendering. Text came from the product lists (https://everest.al/aluminium-full/products/,
  https://everest.al/sq/alumin/produktet/) and the PVC page.
- **Images** are served from everest.al through `next/image` (`remotePatterns` in
  `next.config.ts`). Owner instruction is the permission on record; EVEREST's written consent is
  still to be filed. To self-host, save the files to `public/media/systems/` and change `src`
  in `systems.ts`.
- **Not published:** the Uf values on EVEREST's product list (70 000: 1.9, 71 000: 1.15,
  76 000: 0.89 W/m²K) and the specification tables. They are manufacturer declarations, and the
  71 000 figure differs from the RP2790 node result (1.3). Owner to decide how to present them.
- No calls to action on the cards for now (owner, 2026-10-25). Content to be added later. The
  series name links to its system page where one exists; the cards carry no other action.

**System pages and comparison (2026-10-25):** `src/features/catalog/system-specs.ts`.

- **Pages** exist for every system in the register (owner request, 2026-11-03: "create a page
  for each system"): `/sistemet/30000`, `60000`, `70000`, `71000`, `76000` and `pvc`. A page
  shows only what is verified: the EVEREST description, its catalogue series photograph (60 000,
  70 000, 71 000, 76 000; PVC uses the "76 000 UPVC SYSTEM" page) or, for 30 000 (no catalogue
  page), its EVEREST technical film; the specification table only for comparable systems
  (60 000, 70 000, 71 000); documents where the register has them (70 000, 71 000; PVC lists
  RP2176 and RP2549). Otherwise it states plainly that no verified technical data is published
  yet and offers to send the technical sheet. The comparison still covers 60 000, 70 000 and
  71 000 only.
- **76 000 resolved in part (2026-11-03):** the 2024 catalogue has two different products, "76 000
  SERIES" (aluminium, p. 24) and "76 000 UPVC SYSTEM" (p. 32). RP2549 is the uPVC one, so it is
  listed on the PVC page, not on the aluminium 76 000 page. Its "pending classification" note stays
  until the owner confirms.
- **Catalogue series photographs added:** `series-60000.jpg` (p. 34, "60 000 SERIES", top band),
  `series-76000.jpg` (p. 24, left), `series-pvc.jpg` (p. 32, "76 000 UPVC SYSTEM", right), cropped
  from the native 300 ppi page image above the caption bar and shown framed at half width.
- **Values** are either a fact of a verified document, rendered from `Documents.items`, or a
  statement from the EVEREST product list (https://everest.al/aluminium-full/products/, read
  2026-10-25): Windows/Doors, Tilt & Turn, "non-insulated" (60 000), "engineered to perform"
  / energy efficiency (70 000), "maximum thermal insulation" and "basic depth of 90 mm"
  (71 000). Everything else shows as not documented.
- The product-list Uf figures stay unpublished (see above). The 71 000 product page still
  rendered no text on 2026-10-25.
- **Not published as AL STORE systems:** "3000", "4300" and "6000" (named in an owner request,
  2026-10-25) match no verified source. Confirm the exact series before adding them.
- **Colours and finishes:** no per-system finish list exists in any verified source. Nothing is
  published until EVEREST colour documentation and approved images are supplied.

### Verified technical documents (read 2026-10-20)

Supplied in `certificates/` (local archive, not a public route). Laboratory PDFs say IRCCOS
allows full reproduction only, and partial reproduction needs written authorisation. The owner
confirmed permission to republish the eight IRCCOS reports (2026-10-21), so they are copied
**complete and unaltered** to `public/documents/` and embedded in the document viewer. Never trim,
split or edit them. EPD, ASI and Passive House files are linked from the official URLs below.

Every performance figure on the site is the result for the **named sample or node** in that
report. It is not applied to a whole series or to the Aluminium / PVC categories.

| Document                                                                  | What it is                                                                                               | Series it may be attached to                                                                                                                                | Published result                                                                                                                            | Source                                                                                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1994-CPR-RP2147, issued 23 Dec 2020, IRCCOS                               | Laboratory test report, not a certificate of conformity                                                  | Aluminium 70 000. Double-casement tilt-and-turn window, declared 1 447 mm × 1 650 mm, glazing 4 / 20 / 33.1 mm                                              | Air class 4 (EN 1026:2016 / EN 12207:2016); water class E1500 (EN 1027:2016 / EN 12208:1999); wind class C5 (EN 12211:2016 / EN 12210:2016) | `/documents/everest-70000-rp2147.pdf`                                                                              |
| 1994-CPR-RP2146, issued 23 Dec 2020, IRCCOS                               | Laboratory test report                                                                                   | Aluminium 71 000. Same window type, declared 1 447 mm × 1 650 mm, glazing 4 / 36 / 33.1 mm                                                                  | Air class 4 (EN 12207:2016); water E1500; wind C5                                                                                           | `/documents/everest-71000-rp2146.pdf`                                                                              |
| 1994-CPR-RP2790, issued 23 Jan 2024, IRCCOS                               | Thermal calculation of **one** frame node, not a window classification                                   | Aluminium 71 000, lateral / lower / upper node, profiles 71101 and 71281, triple glazing 48 mm                                                              | Uf = 1.3 W/(m²K). EN ISO 10077-2:2017, radiosity method, inside 20 °C, outside 0 °C                                                         | `/documents/everest-71000-rp2790.pdf`                                                                              |
| 1994-CPR-RP2157, issued 13 Jan 2021 (cover date), IRCCOS                  | Laboratory test report. The report's own trade name is PB2AAR_EVEREST_91000                              | Aluminium 91 000, from that name and profiles 91106, 91202, 91204, 91501. Double-casement sliding door, declared 2 000 mm × 2 400 mm, glazing 4 / 16 / 4 mm | Air class 4 (EN 12207:2017); water class 8A; wind class B3                                                                                  | `/documents/everest-91000-rp2157.pdf`                                                                              |
| 1994-CPR-RP2144, issued 23 Dec 2020, IRCCOS                               | Laboratory test report, **with** central reinforcement                                                   | Aluminium 92 000. 300 kg lift-and-slide door as described on the cover, declared 2 570 mm × 2 450 mm, glazing 4 / 18 / 33.1 mm                              | Air class 4 (EN 12207:2017); water 8A; wind **C4**                                                                                          | `/documents/everest-92000-rp2144.pdf`                                                                              |
| 1994-CPR-RP2145, issued 23 Dec 2020, IRCCOS                               | Laboratory test report, **without** central reinforcement. Do not merge with RP2144                      | Aluminium 92 000. Same door description and declared size                                                                                                   | Air class 4 (EN 12207:2017); water 8A; wind **B4**                                                                                          | `/documents/everest-92000-rp2145.pdf`                                                                              |
| EPD-IES-0026335, version 8 Oct 2025, valid to 7 Oct 2030                  | Environmental declaration (ISO 14025, EN 15804). Not a laboratory class                                  | Representative profile 71 000. Also named: 92 000, 93 000, CE 32 000, E50, E34. No other series                                                             | Declared unit 1 kg. No Uf or class from this EPD is published as a test result                                                              | https://www.environdec.com/library/epd26335                                                                        |
| 1994-CPR-RP2176, issued 16 Feb 2021, IRCCOS                               | Laboratory test report                                                                                   | PVC 85 000. Double-casement tilt-and-turn window, declared 1 447 mm × 1 650 mm, glazing 4 / 12 / 4 mm                                                       | Air class 4 (EN 12207:2016); water E1500; wind C5                                                                                           | `/documents/everest-pvc-85000-rp2176.pdf`                                                                          |
| 1994-CPR-RP2549, issued 11 Jul 2022, IRCCOS                               | Thermal calculation of three nodes. The report calls the series PVC. **Catalogue match is not verified** | PVC 76 000, pending that check. Nodes 01 and 02 frame–sash, node 03 sash meeting. Triple glazing 43 mm                                                      | Uf = 1.2 W/(m²K) on each of the three nodes, EN ISO 10077-2:2017. Boundary temperatures are not stated as a published condition             | `/documents/everest-pvc-76000-rp2549.pdf`                                                                          |
| ASI certificate 554, Performance Standard V3.1, 24 Apr 2026 – 23 Apr 2029 | Manufacturer certification of **Everest Shpk**, Kamez. Not a product certificate and not AL STORE's      | No series                                                                                                                                                   | Scope as printed on the certificate. Maturity ratings are not published                                                                     | https://aluminium-stewardship.org/wp-content/uploads/2026/05/ASI-Audit-Report-Everest-Shpk.-Certificate-554-PS.pdf |

**Manufacturer references only. AL STORE does not sell these and must not offer them for quotation:**

| Document                                                            | Attached to                                                                                         | Rule                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EPD-IES-0026336, 8 Oct 2025 – 7 Oct 2030                            | Hybrid aluminium/PVC profile 67 000                                                                 | Environmental declaration. Classes stated inside the EPD (phB, C4, E1350, class 4) stay attributed to that declaration, not to Aluminium or PVC. Registry: https://www.environdec.com/library/epd26336                              |
| Passive House certificate, component 2570ws04, valid to 31 Dec 2027 | EV HYBRID window system, manufacturer EVEREST, Tirana. Efficiency class phB, warm temperate climate | Not an AL STORE product. Certificate: https://database.passivehouse.com/en/components/certificate/download/2616/en . Verification: https://database.passivehouse.com/en/components/details/window/everest-ev-hybrid-system-2570ws04 |

Accessories have no document in this archive. Do not invent one.

**Resource fields (read from each file, 2026-10-25):** all twelve documents are English PDFs.
The eight IRCCOS reports name EVEREST SHPK as applicant, both EPDs name EVEREST as EPD owner,
ASI 554 is presented to Everest Shpk. and the Passive House certificate names EVEREST as
manufacturer, so each is marked an official EVEREST document (`everestRole`). RP2790 and RP2549
are filed as thermal calculations (their executed test). No catalogue, drawing, specification or
installation guide has been supplied: those categories exist in the data model only and are not
shown until a verified file, with EVEREST's permission to publish it, is recorded here.

- **Primary source:** https://everest.al/ and official EVEREST catalogues supplied through the
  owner.
- Record each document used: title, URL or file, version or date, and who supplied it.
- Product names, series numbers and technical values must be copied exactly. Don't round or
  "improve" specs.
- No prices, stock levels or lead times on the site.
- EVEREST images and drawings may be used only with permission recorded here (who granted it,
  when, scope).

## 6. Fonts and third-party code

| Item                      | Licence     | Location                                                        |
| ------------------------- | ----------- | --------------------------------------------------------------- |
| Archivo (variable, Latin) | SIL OFL 1.1 | `src/styles/fonts/` (from `@fontsource-variable/archivo@5.3.0`) |

## 7. Projects

**Status: none published.** No project photography or client consent has been delivered (§4).
The register in `src/features/projects/projects.ts` is empty, and `/projekte` ↔ `/en/projects`
return 404. Never fill it with examples, stock or AI images, EVEREST's own reference projects,
or the client/partner logos from git history (§4).

**Evidence a project needs before it is added:**

| Evidence       | Requirement                                                                                                                        | Schema field                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Photos         | Supplied by the owner (taken by AL STORE or a photographer it commissioned), with the right to publish. Not stock                  | `images`, `provenance.photosSuppliedBy`, `…ReceivedOn` |
| Client consent | Written consent from the building owner or client to publish the project, its photos and its location                              | `provenance.clientConsentOn`, `…consentRecord`         |
| Location       | Municipality or city, confirmed by the owner. No street address for private clients                                                | `location`                                             |
| System         | The EVEREST system(s) actually supplied, confirmed by the owner (keys from `src/features/catalog/systems.ts`)                      | `systems`                                              |
| Wording        | Original text from the owner, in Albanian and English. No performance claims beyond §5. Client named only if the consent covers it | `title`, `summary`, `body`                             |

Wording rules: AL STORE **supplied** the EVEREST systems. Don't say AL STORE manufactured or
installed them unless the owner confirms its role on that project.

**Publication thresholds** (`src/features/projects/queries.ts`, to avoid thin pages):

- Gallery page: at least **3** approved projects (`MIN_GALLERY_PROJECTS`).
- Filters by system or project type: at least **6** projects, and two or more distinct values in
  that dimension (`MIN_FILTER_PROJECTS`).
- Detail page: an original `body` text and at least **3** photos (`MIN_DETAIL_IMAGES`).

**Register** (add one row per approved project, in the same change that adds the record):

| Slug | Location | Systems | Photos supplied by / date | Client consent (date, where filed) | Added |
| ---- | -------- | ------- | ------------------------- | ---------------------------------- | ----- |

## 8. Knowledge centre articles

Written 2026-10-25 for `/njohuri` ↔ `/en/knowledge`. Every technical statement traces to a
source below; the full list (with what each source supports) is in each article module's
`sources` and is printed at the end of the article. Lab results are quoted only for the named
sample or node (§5). No Uf from EVEREST's product list is used.

| Article (module)                                                | Sources (read 2026-10-25)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thermal break (`articles/thermal-break.ts`)                     | IRCCOS RP2790 (`/documents/everest-71000-rp2790.pdf`: λ values from EN ISO 10077-2 Annex D Table D.1, Noryl λ 0.180 declared by the applicant, boundary conditions, Uf 1.3 for the one node); EN 14024:2023 scope (BSI Knowledge); ISO 10077-1:2017 scope (NZ Building CodeHub)                                                                                                                                                                             |
| U-values (`articles/u-values.ts`)                               | EN ISO 10077-1:2017 scope (SIS, NZ Building CodeHub); EN 673:2024 scope (SIS); IRCCOS RP2790; MMPH draft regulation on minimum energy-performance requirements, 2026 (https://mmphi.rks-gov.net/MMPHIFolder/AnnouncementFiles/2026_26ec2809-e1c5-48f0-b73e-e6f4e02bf1af.docx): Law No. 08/L-242 (OG No. 10/12.06.2024), glazed components U 1.60 W/(m²K), g 0.60. **Draft**: the article says so; re-check against the adopted text in the Official Gazette |
| Air, water and wind classes (`articles/performance-classes.ts`) | IRCCOS RP2147 (test procedures and the class tables of EN 12207, EN 12208, EN 12210 as reproduced in its §6); sample results from RP2147, RP2146, RP2176, RP2157, RP2144, RP2145 exactly as in §5                                                                                                                                                                                                                                                           |

- The `Uw = (Ag·Ug + Af·Uf + lg·Ψg) / (Ag + Af)` formula is the EN ISO 10077-1 window equation; the
  standard text itself is paywalled, so the article cites its scope pages and gives no numeric Uw.
- Figures are original schematics (no EVEREST drawings or photos).
- **Open:** owner to confirm the wording before indexing; re-read the MMPH regulation once adopted.
