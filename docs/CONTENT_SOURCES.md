# Content sources and provenance

Every fact, text and asset published on the site must trace back to an entry here. If it is not
listed as **verified**, it does not go on the site.

## 1. Verified facts

| Fact              | Value                                | Source                     | Date       |
| ----------------- | ------------------------------------ | -------------------------- | ---------- |
| Business name     | AL STORE                             | Owner brief (Phase 1 spec) | 2026-10-19 |
| Relationship      | Distributor of EVEREST products      | Owner brief                | 2026-10-19 |
| Address           | Isa Boletini, Radivojc 61000, Kosovo | Owner brief                | 2026-10-19 |
| Phone             | +383 44 177 351                      | Owner brief                | 2026-10-19 |
| Email             | alstore.shpk@gmail.com               | Owner brief                | 2026-10-19 |
| Domain            | https://www.alstore-ks.com/          | Owner brief                | 2026-10-19 |
| Manufacturer site | https://everest.al/                  | Owner brief                | 2026-10-19 |
| Languages         | Albanian, English                    | Owner brief                | 2026-10-19 |
| Website type      | B2B catalogue + quotation requests   | Owner brief                | 2026-10-19 |
| Supply 2018–2026  | 8+ years partnership with EVEREST    | Owner (chat), cumulative   | 2026-10-21 |
| Supply 2018–2026  | 100+ supply trucks                   | Owner (chat), cumulative   | 2026-10-21 |
| Supply 2018–2026  | 120+ tonnes of aluminium supplied    | Owner (chat), cumulative   | 2026-10-21 |

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
