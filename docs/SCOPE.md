# AL STORE V7 — Scope

| | |
|---|---|
| Phase | 00 — Scope freeze, architecture, transactional and compliance blueprint |
| Governing spec | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` (V7). V6 requirements are **not** carried over. |
| Stack lock | `rules.md` → persisted as `docs/ARCHITECTURE_LOCK.md` |
| Status | **Proposed — awaiting independent QA (docs/QA_PHASE_00.md) and owner acceptance of V7 (gate RG-00)** |
| Date | 2026-10-13 |

This document freezes what AL STORE is and is not. Anything not listed in §2 is out of scope until the owner changes the V7 spec. Nothing in this document is a claim of legal compliance; every legal question is tracked in `OPEN_LEGAL_DECISIONS.md`.

---

## 1. Product in one paragraph

AL STORE is a **private, invitation-only web application** for one Kosovo VAT-registered wholesale business selling aluminium profiles, PVC, accessories and connectors (≈100–500 SKUs, units kg / m² / copë) from **one physical warehouse**, **exclusively to verified registered businesses (B2B)**. It records sales, issues immutable B2B tax invoices with immediate physical handover, keeps an authoritative stock ledger, records purchases from Kosovo and Albania (supplier invoice, DUD/customs evidence and physical receipt as separate records), non-stock expenses, cash/bank payments allocated to specific invoices, overpayment refund liabilities, historical open invoices migrated after go-live, and monthly purchase/sales books (LB/LSH) that the accountant reviews and the director approves. Official ATK/EDI export stays disabled until authentic templates are verified. All user-facing text is Albanian (`sq-XK`).

## 2. In scope (MVP)

| # | Capability | Spec ref | Phase |
|---|---|---|---|
| S-01 | Two personal accounts: DIRECTOR, ACCOUNTANT; invitation-only; MFA; full audit | A.6, rules §4 | 02 |
| S-02 | Albanian UI shell; home actions **Shitje e re, Blerje e re, Stoku, ATK / EDI** | A.15 | 01 |
| S-03 | Products (SKU, unit kg/m²/copë, category), registered-business customers with verification state, suppliers (Kosovo/Albania) | A.3, A.5 | 03 |
| S-04 | In-app CSV/XLSX import of prepared product lists and signed opening stock | A.11, A.16 | 04 |
| S-05 | Immutable stock movement ledger, no negative stock, reconcilable balance | A.2, A.4 | 05 |
| S-06 | Effective-dated, accountant-approved VAT classification and decimal-safe calculation | A.13, B | 06 |
| S-07 | Sale drafts with negotiated net unit prices (3 dp) and final review | A.4 | 07 |
| S-08 | Atomic issuance: one sale → one immutable tax invoice → one physical fulfillment → stock-out; Albanian PDF download | A.4, A.12, A.13 | 08 |
| S-09 | Credit/debit/correction documents; separate physical fulfillment correction | A.12 | 09 |
| S-10 | Purchases: supplier invoice, import/DUD record, physical goods receipt (separate), discrepancy hold | A.7 | 10 |
| S-11 | Non-stock expense register | A.8 | 11 |
| S-12 | Cash/bank payments, allocations to specific invoices, 15-day default due date, aging, overpayment → refund liability → recorded refund | A.9 | 12 |
| S-13 | Historical receivable/payable invoice references imported after go-live, zero stock/tax posting | A.10 | 13 |
| S-14 | Internal LB/LSH monthly projections | A.13 | 14 |
| S-15 | Isolated official ATK/EDI export adapter, **disabled** until template provenance verified | A.13 | 15 |
| S-16 | Tax period lifecycle: accountant review → director final approval → close; amendments | A.6, A.13 | 16 |
| S-17 | Dashboard, search, operational reports (no margin/profit) | A.14 | 17 |
| S-18 | UX/accessibility audit; security hardening, staging/prod, tested backup/restore; final audit and cutover runbook | — | 18–20 |

## 3. Explicitly out of scope (must not be built)

| Excluded | Reason (spec) |
|---|---|
| B2C sales, POS, consumer checkout, fiscal receipts, fiscal-device integration, any retail-compliance claim | A.1 |
| Any second warehouse / secondary stock location, multi-warehouse transfers | A.2 (the legacy secondary-location name is banned from schema, UI, imports and docs) |
| Manufacturing, cutting, profile-length variants, lot/batch, general unit conversion | A.2, A.3 |
| Standard price lists, sales discount column, customer discount module, barcode-driven checkout | A.3, P07 |
| Full merchandise returns module | A.12 |
| Automatic email delivery of invoices | A.13 |
| Direct ATK login, automatic EDI filing | A.13 |
| Gross margin / profit reporting, inventory valuation reports | A.14 |
| AI accounting, unnecessary modules | A.14 |
| Offline posting queue, background sync | A.15 |
| Access by any development agent to original legacy Excel workbooks; guessing historical SKUs, tax IDs, stock, dates | A.16 |
| Public registration, shared passwords, anonymous/guest access | A.6 |
| Multi-tenant commercial features (org scoping exists only for isolation) | B |

## 4. Source of truth (SoT)

Each fact has exactly one authoritative home. Everything else is a projection that must be reproducible from it.

| Fact | Authoritative source | Derived / projections (never edited by hand) |
|---|---|---|
| Physical quantity on hand per SKU | `stock_movements` (append-only ledger) | `stock_balances` read model, stock reports |
| Whether a SKU may be sold or received at all | Derived `stock_tracking_status` (INV-08): posted opening line VERIFIED_QTY/VERIFIED_ZERO, or created after the opening batch was posted, or resolved by an approved OPENING_RESOLUTION adjustment — plus product active flag | — |
| Legal content of an issued invoice | `tax_invoices` + `tax_invoice_lines` + immutable tax snapshot | PDF rendering (stored copy carries a hash; snapshot wins if they ever differ) |
| Invoice numbering | `invoice_series` counter row (gapless, locked) incl. approved last-legacy number | — |
| Commercial agreement | `sales` + `sale_lines` (draft editable; confirmed frozen) | — |
| Physical handover | `fulfillments` + `fulfillment_lines` (+ `fulfillment_corrections`) | stock movements of type SALE_FULFILLMENT / FULFILLMENT_CORRECTION |
| Supplier's commercial claim | `purchase_invoices` | payables |
| Import customs evidence | `import_declarations` (DUD) | LB inputs per approved mapping |
| Goods physically received | `goods_receipts` (POSTED) | stock movements of type PURCHASE_RECEIPT |
| Money actually moved | `payments`, `refunds`, `payment_reversals` | balances, aging, statements |
| What money settles which document | `payment_allocations` | receivable/payable balances |
| Customer overpayment owed back | `customer_refund_liabilities` (created by an overpayment) settled by `refunds` | — |
| Pre-cutover open obligations | `historical_obligations` (approved import batches) | "Borxhet e regjistruara në AL STORE" |
| VAT treatment | approved, effective-dated `vat_rules` → snapshot on each posted document | LB/LSH projections |
| Monthly tax books as approved | `tax_period_snapshots` (hash-locked at accountant review / director approval) | exports |
| Who did what | `audit_events` (append-only) | — |
| Identity of a user | Supabase Auth (authentication only) | — |
| Role/permission of a user | `app.user_roles` (never `user_metadata`) | — |
| Pre-cutover business history | **Legacy Excel, outside AL STORE** (archive) | only verified open obligations are imported |

Rules: no manually typed running balances; no cached figure is ever the source for a posting decision without a lock-protected check against its SoT; reports state their source and as-of time.

## 5. Users and personas

| Persona | Account | Typical device | Core needs |
|---|---|---|---|
| Owner / Director | DIRECTOR | Phone in the warehouse, desktop in office | Issue a B2B invoice fast while goods are handed over; see stock; record purchases; final-approve the month |
| Accountant | ACCOUNTANT | Desktop | Classify VAT, review purchases/expenses/corrections, review LB/LSH, approve tax configuration, record review |
| (No other users) | — | — | No customer/supplier portals, no guest access |

## 6. Primary user journeys (target behaviour; built in the phases listed)

### J-1 Sale with immediate handover (P07–P08) — the most important flow
1. Customer phones; owner opens **Shitje e re**.
2. Selects a **verified** registered business buyer (unverified buyers are visibly blocked from issuance).
3. Adds real SKUs, quantities (3 dp, canonical unit), negotiated unit price excluding VAT (3 dp). Draft saves; stock is **not** touched.
4. Final review screen: buyer, lines, units, VAT, EUR totals (2 dp), due date (default +15 calendar days), live stock availability, explicit acknowledgment that goods are handed over now.
5. Owner presses the explicit issue button (never Enter-to-submit). One atomic transaction allocates the invoice number, freezes the sale, writes the invoice and tax snapshot, posts the fulfillment and exactly one stock-out per line.
6. PDF is generated after commit and can be downloaded any number of times; downloads change nothing.

### J-2 Import purchase from Albania (P10)
Supplier invoice (EUR) registered → DUD/customs record registered and linked, with customs amounts and import VAT in separate fields → goods arrive → physical count at receipt → **posted receipt** creates stock-in. Discrepancy → hold until reviewed. Accountant classifies VAT separately.

### J-3 Domestic purchase (P10)
Same as J-2 without the import declaration.

### J-4 Expense (P11)
Rent/electricity/transport/service invoice recorded with evidence; accountant classifies; never touches stock.

### J-5 Payment received (P12)
User picks the specific invoice(s); enters actual amount, date, method (cash/bank), reference. Allocation is capped at outstanding balance. Excess becomes a refundable liability only after explicit confirmation; actual refund is recorded later.

### J-6 Correction (P09)
Issued invoice is never edited. User picks a preset reason (+ optional comment) → correction document drafted → accountant approves treatment → issued with its own identity referencing the original. If the physical quantity handed over was wrong, a **separate** fulfillment correction is approved and posts the stock difference.

### J-7 Monthly ATK cycle (P14–P16)
Period → READY_FOR_ACCOUNTANT_REVIEW → accountant reviews, flags, marks ACCOUNTANT_REVIEWED (hash-locked) → director DIRECTOR_APPROVED → owner files manually in EDI outside the app → filing receipt recorded → CLOSED. Official export button stays disabled with "Eksporti ATK është në pritje të verifikimit" until gate VG-12 passes; internal preview is labeled "JO PËR DORËZIM".

### J-8 Cutover (P04, P20)
See `LEGACY_CUTOVER_PLAN.md`.

### J-9 Historical debt import after go-live (P13)
Owner uploads a prepared file in the app → dry run → row errors → accountant validation → director approval → records become payable/collectable. Day-to-day screens are titled "Borxhet e regjistruara në AL STORE" without a warning banner; a restricted progress view shows completeness.

## 7. Critical failure handling (summary — detail in `DATABASE_TRANSACTION_BOUNDARIES.md` §6)

| Failure | Required outcome |
|---|---|
| Double click / repeated submit / two tabs | Exactly one invoice, one fulfillment, one stock-out (idempotency key + unique constraints + row locks) |
| Timeout after server commit | Retry with same key returns the already-issued invoice; UI checks status before offering a new attempt |
| Two users selling the last stock | One succeeds; the other gets an Albanian "insufficient stock" explanation; balance never < 0 |
| PDF generation fails after issuance | Invoice remains issued; PDF regenerated from snapshot; never re-issued |
| Attachment upload fails | Business record not posted, or posted without the link and flagged; never a dangling DB reference |
| Buyer verification revoked between draft and issue | Issue rejected at commit time (re-checked inside the transaction) |
| VAT config / series / legal gate not approved | Issue blocked with a clear Albanian reason — never a silent default |
| Ledger vs balance mismatch | Integrity alert; postings for the affected SKU blocked until reconciled |
| Payment for a not-yet-imported historical invoice | Rejected; procedure in `LEGACY_CUTOVER_PLAN.md` §7 |
| DB restore after incident | Reconcile issued invoice numbers against PDFs already handed to customers before any new issuance (`THREAT_MODEL.md` T-22) |

## 8. Repository state at Phase 00 (inspected 2026-10-13)

| Item | Finding | Action |
|---|---|---|
| Application code | None. Former static marketing site was deleted in commit `c3841d8`. | Nothing to reuse; no duplicate risk. |
| `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md`, `rules.md` | Present, **untracked** | Owner should commit both so the lock is versioned (RG-02). |
| `package.json` | Had only a `cypress` devDependency | Removed 2026-10-13 on owner instruction (C-02, OWN-11); no dependencies remain. |
| `cypress/`, `cypress.config.js` | Untracked Cypress example specs | Deleted 2026-10-13 (C-02). |
| `.agents/skills/supabase*` | Agent skill guidance (tracked) | Kept; consistent with stack. |
| `.env` | Contains Supabase URL, publishable key, **secret key**, JWKS URL. Gitignored; `git log --all` shows it was **never committed**. | Confirm which Supabase project this is; it must be dev/staging, never production (OWN-08). |
| Git history | `.cursor/mcp.json` (Supabase project ref, no secret) existed in history; site had a `CNAME` (GitHub Pages). | **Repository must be confirmed private** before business code (RG-01). |
| Remotes | `origin` = `<origin-owner>/alstore`, `upstream` = `<upstream-owner>/alstore` | Both must be private and access-controlled. |

## 9. Spec conflicts and ambiguities resolved in Phase 00

| ID | Conflict / ambiguity | Resolution | Needs owner? |
|---|---|---|---|
| C-01 | Spec allows Prisma **or** Drizzle | `rules.md` locks **Drizzle** (ADR-001) | No |
| C-02 | Cypress installed; spec and lock require Playwright | Playwright adopted; Cypress **removed 2026-10-13** on owner instruction | Decided — OWN-11 |
| C-03 | Spec header: "supersedes V6 only after owner accepts this document" | Treated as accepted for documentation work per Prompt 00; formal acceptance is gate RG-00 | Yes — OWN-01 |
| C-04 | `rules.md` requires MFA; spec silent | MFA required (stricter wins) | No |
| C-05 | `rules.md` requires `docs/ARCHITECTURE_LOCK.md`, not in Prompt 00 list | Created | No |
| C-06 | Phase 05 allows "physically verified goods returned … exceptional correction" vs A.12 "no returns module" | Modeled as an approved inventory adjustment subtype `EXCEPTIONAL_RETURN` with four-eyes approval; no returns module, no fictitious purchase | No |
| C-07 | "Restricted administrator progress view" but no admin role exists | Permission `historical_import.progress.view`, granted to both roles; separate screen, not on day-to-day UI | Confirm — OWN-06 |
| C-08 | Who may issue invoices: A.4 says "owner confirms"; A.6/P02 give both users broad operational rights | Default: both roles may issue; every issuance attributed; owner may restrict to DIRECTOR via protected setting | Yes — OWN-04 |
| C-09 | Cash rule must not be hard-coded, yet cash payments occur from day one | Until VG-11 is approved, every cash payment/refund requires explicit accountant confirmation; no numeric limit is guessed | Confirm — OLD-10 |
| C-10 | Supplier overpayments not addressed by spec | Recorded as supplier credit (symmetrical liability record) only after accountant approval; open item | Yes — OLD-16 |
