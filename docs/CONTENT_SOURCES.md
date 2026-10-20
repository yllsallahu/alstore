# Content sources and provenance

Every fact, text and asset published on the site must trace back to an entry here. If it is not
listed as **verified**, it does not go on the site.

## 1. Verified facts

| Fact              | Value                                            | Source                     | Date       |
| ----------------- | ------------------------------------------------ | -------------------------- | ---------- |
| Business name     | AL STORE                                         | Owner brief (Phase 1 spec) | 2026-10-19 |
| Relationship      | Distributor of EVEREST products                  | Owner brief                | 2026-10-19 |
| Address           | Isa Boletini, Radivojc 61000, Kosovo             | Owner brief                | 2026-10-19 |
| Phone             | +383 44 177 351                                  | Owner brief                | 2026-10-19 |
| Email             | alstore.shpk@gmail.com                           | Owner brief                | 2026-10-19 |
| Domain            | https://www.alstore-ks.com/                      | Owner brief                | 2026-10-19 |
| Manufacturer site | https://everest.al/                              | Owner brief                | 2026-10-19 |
| Languages         | Albanian, English                                | Owner brief                | 2026-10-19 |
| Website type      | B2B catalogue + quotation requests               | Owner brief                | 2026-10-19 |
| Certification     | All products certified to European ISO standards | Owner statement in chat    | 2026-10-20 |

The certification claim is the owner's wording. No certificate, standard number or issuing body
has been supplied yet. Add them here before naming any specific standard on the site.

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
before any of them appear.

## 4. Brand assets

| Asset                      | Status            | Notes                                                                                                                                                                                                                               |
| -------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official AL STORE logo     | **Partial**       | Owner supplied `images/logo without bg.png` (2026-10-20). Cropped transparent wordmark is `public/brand/alstore-logo.png`, registered as `logo.primary` (header). `logo.inverse` is still null                                      |
| Brand colours / guidelines | **Not delivered** | Tokens are provisional (DESIGN_RULES §2)                                                                                                                                                                                            |
| Photography                | **Not delivered** | No still photography yet                                                                                                                                                                                                            |
| Home hero video            | **Supplied**      | Owner supplied `images/Untitled design.mp4` (2026-10-20, replaces an earlier warehouse clip), published as `public/media/hero-video.mp4` with a first-frame poster. Location not confirmed: don't caption it as AL STORE's premises |
| Open Graph image           | **Not delivered** | `ogImage` = null                                                                                                                                                                                                                    |
| Favicon / app icons        | **Not delivered** | No icon is shipped; browsers show the default                                                                                                                                                                                       |

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
  2026-10-20), published as `public/media/categories/window.png`. Original author not recorded;
  confirm usage rights with the owner.
- **Copy (owner asked to use everest.al, read 2026-10-20):** aluminium and PVC descriptions and
  tags are paraphrased from https://everest.al/sq/alumin/, https://everest.al/sq/pvc/ and
  https://everest.al/sq/alumin/produktet/ (system types only, no series or values).
- **Not used from everest.al:** warranty (the English page says 100 years, the Albanian page 10),
  "since 1997", awards and certificates. Resolve with the owner before publishing any of them.
- **Accessories:** everest.al has no accessories category. The copy stays generic (no items named).

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
