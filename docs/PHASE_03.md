# PHASE 03 — Master data: products, registered business customers, suppliers

| | |
|---|---|
| Date | 2026-10-13 |
| Executed by | Claude (Anthropic) on a copy of the owner's working tree in a Linux sandbox; changed files written back to the owner's `alstore` folder |
| Spec | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` — PROMPT 03 |
| Predecessor | Phase 02 — QA **WAIVED BY OWNER** (`docs/QA_PHASE_02.md`), not an independent PASS |
| Database used | Local PostgreSQL **16.x** cluster (`scripts/db-local.sh`) in the sandbox; Phase 02 used 17.11. No Supabase project was contacted. `.env` files were not copied or opened. |
| Verdict (agent) | **PARTIAL PASS**: everything in scope is implemented and tested. Two items stay BLOCKED: real login (Supabase Auth, RG-03) and recording a manual verification from the UI (private document storage). Awaiting independent QA. |

## 1. What this phase delivers

### Products (`/stoku/produktet`)
- Create, edit and search products. The SKU is unique, immutable and canonical: trimmed and upper-cased, `[A-Z0-9][A-Z0-9./_-]{0,39}`. It is checked by the service, a DB CHECK and the existing `(org_id, sku)` unique constraint. `al-01` and `AL-01` can never both exist, and a concurrent double create yields one product and one `SKU_TAKEN`.
- Each product has a name, category (Alumin / PVC / Aksesorë / Tjetër), canonical unit (kg / m² / copë only), an active flag, an optional barcode (unique per organization) and an optional reference purchase price.
- The reference purchase price is `numeric(18,3)` and is labeled informational only. Input accepts `12,5` or `12.5`, at most 3 decimals and exactly one separator; `1.234,5` is rejected rather than guessed. No JS floats are used: `src/lib/decimal.ts` is string-based.
- Duplicate display names are allowed after an explicit warning and confirmation. The confirmation is recorded in the audit (`duplicatesAcknowledged`). SKUs that differ only by separators (`AL-01` / `AL01`) also trigger a warning.
- Unit rule (INV-05):
  - Without stock movements, the unit is edited freely.
  - Once movements exist, the edit form locks the unit, the service refuses with `UNIT_LOCKED`, and the trigger refuses with SQLSTATE 55000.
  - The only exception is an **explicit, audited, four-eyes approved unit migration** (`product_unit_changes`, new permission P-14). The request needs a reason; the approver must be the other user; it is applied only at on-hand 0.000 and with no open drafts referencing the product. Quantities are never converted.
  - The trigger accepts the unit change only for an approval decided in the same transaction (`decided_at = now()`), so an old approval id cannot be replayed.
- Search puts SKU first: exact SKU, then SKU prefix (index `products_sku_prefix_idx`, `text_pattern_ops`), then contains, then name without ë/ç, then exact barcode. LIKE wildcards in the input are escaped. Results are capped at 50 with an honest "shfaqen 50 të parët".
- Optimistic `version` on products (new column), customers and suppliers. A stale tab or a concurrent edit gets `STALE_VERSION` with an Albanian message.

### Customers (`/klientet`)
- Registered businesses only. A customer needs a legal name plus **at least one** business identifier: NUI, numri fiskal or numri i TVSH-së. Billing address and city are optional, and the list flags "Faturimi i paplotë".
- **OLD-14 is still OPEN.** The accountant has not approved which identifiers are mandatory or their formats, so this phase makes them **configuration owned by the ACCOUNTANT** instead of guessing:
  - New table `identifier_format_rules`, permission P-15, enforced by service and DB trigger.
  - Each rule sets required yes/no, digits only, min/max length, and a mandatory source note.
  - Screen: `/klientet/rregullat`, read-only for the director.
- Verification states are derived from the append-only `customer_verifications` history, never stored:
  - **I paverifikuar**: no current check.
  - **Formati i vlefshëm**: recorded automatically on save only if *every* entered identifier has an ACTIVE rule and passes it. It is labeled "not a registry check, does not allow invoicing".
  - **I verifikuar manualisht**: manual check with a stored evidence document and a note, optional `valid_until`.
  - **I pezulluar**.
  - **Officially verified** can never occur: a DB CHECK (`customer_verifications_no_official_ck`) forbids `OFFICIAL_SOURCE`, and the UI states "Nuk bëhet: nuk ekziston lidhje e besueshme me regjistrin zyrtar".
- Each check stores an `identity_hash` (legal name + identifiers). Changing either makes earlier checks stale and the customer must be verified again. A billing-address change does not.
- Suspension takes effect at once. Lifting it (reinstatement, P-13) leaves the customer UNVERIFIED until checked again. A failed manual check also leaves the customer UNVERIFIED.
- **Issuance guard for Phases 07–08**: `getCustomerInvoiceEligibility(tx, id, { lock })`. It fails closed: eligible only if the customer is active, MANUALLY_VERIFIED, not expired or stale, **and gate VG-07 is APPROVED**. VG-07 is NOT_STARTED, so no customer is invoiceable today, and each customer page says why in Albanian.
  - With `lock`, the customer row is held `FOR SHARE`, and suspension takes `FOR UPDATE`. A test proves a suspension waits for an in-flight issuance check (SCOPE.md "verification revoked between draft and issue").
- Duplicate warnings: the same identifier value, or the same legal name with legal-form suffixes ignored (`Alfa SH.P.K.` = `alfa shpk`). SQL and TypeScript normalization are tested to agree.
- Identifier values never appear in audit `safe_details`: audit rows hold field names and before/after hashes only (tested).

### Suppliers (`/furnitoret`)
- Legal name; country Kosova or Shqipëri only (DB CHECK).
- Currency is always EUR: DB CHECK, and the UI shows it as fixed.
- Identifiers depend on the country: NUI, fiscal or VAT number for Kosovo; NIPT/NUIS for Albania. An identifier of the wrong country is rejected.
- Address, city, and a note on how the supplier references its own invoices (`invoice_reference_note`). Linking actual purchase invoices is Phase 10, and the page says so.
- Duplicate warnings (same identifier or name), versioned edits, audit.

### Common
- Every write goes through server-side services that check authorization (P-10 … P-16, role before MFA), re-check the actor inside the transaction, claim a durable idempotency key and write one audit event.
- Forms carry a fresh idempotency key per render, and the submit button disables while pending. A browser test proves a double tap creates exactly one product.
- All UI text is Albanian. Field errors are tied to their inputs with `aria-invalid` / `aria-describedby` and summarized at the top of the form.
- Form controls are ≥ 44 px (h-12 inputs, large buttons); a browser test checks every control on the create forms at 360, 375, 430 and 1440 px. There is no horizontal overflow.

## 2. Decisions

| Decision | Reason |
|---|---|
| Phase started on owner waiver of Phase 02 QA | Owner: "run phase 03 i will test my self phsase 2" (`docs/QA_PHASE_02.md`). |
| Login stays BLOCKED; owner will create a dev Supabase project | Owner answer "I'll create a dev project". Real sessions are not wired in this phase. |
| **Development preview actor** (`src/server/auth/session.ts`). Only when `APP_ENV=development`, `UI_PREVIEW=true` and `DATABASE_URL` is on 127.0.0.1/localhost, the screens act as one of two synthetic local users (`DEV_PREVIEW_DIRECTOR_ID` / `DEV_PREVIEW_ACCOUNTANT_ID`). Role and status are loaded from the DB; MFA is treated as satisfied. The banner names the acting user and can switch role (needed for four-eyes and accountant-only screens). | Spec requires UI-layer tests and screenshots, and no auth provider exists. Env validation rejects these variables outside development or with a non-local database (unit-tested). Everywhere else the screens show "Hyrja me llogari personale nuk është aktivizuar ende" and nothing is readable or writable. **Must be removed or kept dev-only when Supabase Auth is wired.** |
| Identifier requirements/formats = accountant configuration (P-15), not code | OLD-14 OPEN; "no legal guessing". The only built-in rule is structural: a registered business has ≥ 1 business identifier. |
| Manual verification needs an evidence document in `document_files`; the UI button is disabled with an explanation | Private document storage (Supabase Storage) is not set up (RG-03), so a document cannot be uploaded honestly. The service and its tests exist; the UI path opens when storage exists. |
| Only MANUALLY_VERIFIED + VG-07 APPROVED permits issuance | Spec A.5 and DOMAIN_MODEL 3.3: format validity never permits issuance. If the accountant's VG-07 memo demands more, `INVOICEABLE_STATES` / the gate change. |
| Unit migration only at zero stock, no conversion, no open drafts | Spec forbids general unit conversions; a non-zero balance in the old unit would be meaningless in the new one. Otherwise: deactivate the SKU and create a new one. |
| Barcode unique per organization | A shared barcode would make later lookups ambiguous. |
| Products remain under Stoku (`/stoku/produktet`); Stoku shows "Pjesërisht aktiv" | PROMPT 01 fixed the navigation items; stock balances stay a Phase 04–05 placeholder. |
| `OWN-14` (linked customer/supplier records) not exposed in UI | Not requested by PROMPT 03; schema columns exist. |

## 3. Files

### Created
- Services: `src/server/services/master-data/{common,products,customers,suppliers,identifier-rules,verification-state}.ts`
- Server: `src/server/auth/session.ts`, `src/server/db/app-db.ts`, `src/server/actions/form-action.ts`
- Lib: `src/lib/decimal.ts`, `src/lib/dates.ts`, `src/lib/master-data-labels.ts`, `src/lib/validation/master-data.ts`
- Pages:
  - `src/app/(app)/stoku/produktet/{page,actions}.tsx|ts`, `…/i-ri/page.tsx`, `…/[id]/page.tsx`
  - `src/app/(app)/klientet/{actions.ts,i-ri/page.tsx,[id]/page.tsx,rregullat/page.tsx}`
  - `src/app/(app)/furnitoret/{actions.ts,i-ri/page.tsx,[id]/page.tsx}`
  - `src/app/(app)/preview-actions.ts`
- Components:
  - `src/components/forms/{field,submit-button,form-state,form-messages}.tsx|ts`
  - `src/components/master-data/{page-header,search-box,unavailable,saved-notice,audit-history,verification-badge,product-form,customer-form,supplier-form,unit-change-panel,simple-forms}.tsx`
  - `src/components/ui/{alert,select,textarea}.tsx`
  - `src/components/app-shell/{preview-banner,preview-role-switch}.tsx`
- Migrations: `drizzle/0002_master_data.sql` (generated), `drizzle/0003_master_data_guards.sql` (custom), `drizzle/rollback/0002_0003_down.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/0003_snapshot.json`
- Scripts: `scripts/e2e-db.mjs` (recreates local `alstore_e2e` with synthetic users; refuses non-local hosts)
- Tests: `tests/unit/master-data.test.ts`, `tests/db/master-data-products.test.ts`, `tests/db/master-data-parties.test.ts`, `tests/e2e/master-data.spec.ts`
- Docs: `docs/PHASE_03.md`, `docs/QA_PHASE_02.md` (owner waiver), screenshots `docs/screenshots/phase-03/*.png` (38, synthetic data only)

### Modified
- Schema: `src/server/db/schema/{enums,parties,catalog-inventory}.ts`, `drizzle/meta/_journal.json`
- `src/server/auth/permissions.ts` (P-14, P-15, P-16); `src/server/errors.ts` (ValidationError, DuplicateWarning, staleVersion)
- `src/lib/env.ts` (DATABASE_URL, DEV_PREVIEW_*; validation); `src/lib/navigation.ts` (module status)
- `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (badges), `src/app/(app)/stoku/page.tsx`; `src/app/(app)/klientet/page.tsx` and `src/app/(app)/furnitoret/page.tsx` (placeholders replaced by real screens)
- `src/components/app-shell/app-shell.tsx`, `src/components/ui/status-badge.tsx`, `src/app/globals.css` (success tokens)
- `playwright.config.ts`:
  - The web server first runs `scripts/e2e-db.mjs`, with local synthetic env.
  - Optional `PW_CHROMIUM_EXECUTABLE` override; unset means Playwright's own browser.
- Tests: `tests/unit/permissions.test.ts`, `tests/db/{helpers,structure,rollback}.test.ts|ts`, `tests/e2e/{helpers,shell.spec}.ts`
- Docs: `docs/ROLE_PERMISSION_MATRIX.md` (P-13 note, P-14 … P-16), `docs/DOMAIN_MODEL.md` (two new entities)

### Not changed
The spec, `rules.md`, `docs/ARCHITECTURE_LOCK.md`, `.env`, `.env.development.local`, OPEN_LEGAL_DECISIONS (OLD-14 stays OPEN).

## 4. Migrations

| File | Kind | Content |
|---|---|---|
| `0002_master_data.sql` | Generated | Tables `identifier_format_rules`, `product_unit_changes` (60 tables total); `products.version`; `customers.city`; supplier `address`, `city`, `invoice_reference_note`, `updated_at`; `customer_verifications.identity_hash`; CHECKs (SKU format, name/length, barcode format, identifiers are JSON objects, EUR, no OFFICIAL_SOURCE, notes required); unique barcode per org; SKU prefix index |
| `0003_master_data_guards.sql` | Custom | `products_guard` (approved same-transaction unit migration at zero stock); frozen trigger on decided unit changes; accountant-only trigger on format rules; same-org FK triggers, RLS `org_isolation`, least-privilege grants (no DELETE/TRUNCATE) for the new tables; Supabase API roles revoked |

Applying 0002 requires no rows in `customer_verifications` (new NOT NULL column) and upper-case SKUs. Both hold, because no business data exists anywhere.

## 5. Rollback method

- **Before business data exists**: run `drizzle/rollback/0002_0003_down.sql` as the migration owner. It restores the Phase 02 schema and `products_guard`, then removes the two journal rows so `npm run db:migrate` re-applies them. This is tested end to end (up → down → up) in `tests/db/rollback.test.ts`. The full Phase 02 rollback (`0000_0001_down.sql`) still works and is tested.
- **After business data exists**: never drop. Fix forward with a reviewed migration.

## 6. Commands actually executed (sandbox: Linux, Node v22.22.0, PostgreSQL 16)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm ci` | 0 | Installed from the lockfile (no dependency changes this phase) |
| 2 | `bash scripts/db-local.sh init && … start` (as non-root) | 0 | Local cluster on 54329 |
| 3 | `npm run typecheck`, `npm test`, `npm run test:db` (baseline, unchanged code) | 0 each | 69 unit, 43 DB tests |
| 4 | `npx drizzle-kit generate --name=master_data` | 0 | Regenerated once after renaming `created_at` → `requested_at` on unit changes |
| 5 | `npx drizzle-kit generate --custom --name=master_data_guards`; `npx drizzle-kit migrate` (local `alstore_dev`) | 0 | Applied |
| 6 | `npm run test:db` | 1 | 42/43: rollback test expected 58 tables (now 60); test extended with the 0002/0003 rollback |
| 7 | `npm run test:db -- master-data-products` | 1 | 19/23: optional form fields declared with `z.union([...undefined])` were not optional keys in Zod 4 → `.nullish()` |
| 8 | same | 1 | 5/23: tests passed the SKU in update payloads (correctly refused as `SKU_IMMUTABLE`); search for `%` matched everything because the normalized name became empty → condition skipped when empty |
| 9 | same, then `master-data-parties` | 0 | 23/23, 20/20 |
| 10 | `npm test` | 0 | 106 unit tests |
| 11 | `npx eslint . --max-warnings=0` | 1 | Unused variable in a test; fixed |
| 12 | `npx playwright test` | 1 | 76 failed: sandbox Chromium 1194 ≠ pinned build 1248 → added optional `PW_CHROMIUM_EXECUTABLE` |
| 13 | `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test` | 1 | 13 failed: Next.js route announcer also has `role=alert` (selectors scoped to `<main>`); **bug**: switching preview role returned to `/` (now stays on the page) |
| 14 | same | 1 | 2 failed: **bug**: after a save redirected to the same page, the edit form kept stale uncontrolled values (unit still "kg" after migration) → forms keyed by record version; plus a selector |
| 15 | same | 1 | 1 failed: ambiguous text selector |
| 16 | same (final) | **0** | **69 passed, 7 skipped** (desktop-only shared-data tests on 3 mobile sizes; mobile-menu test on desktop) |
| 17 | `npm run format:check` / `lint` / `typecheck` | 0 / 0 / 0 | — |
| 18 | `npm test` | 0 | **7 files, 106 tests** |
| 19 | `npm run test:db` | 0 | **7 files, 88 tests** |
| 20 | `npm run build` | 0 | 22 routes |
| 21 | `node scripts/verify-phase-00.mjs` | 0 | `RESULT: PASS` |
| 22 | `npm audit --omit=dev` | 0 | 0 vulnerabilities (dev tooling unchanged from Phase 02) |

The owner's Mac was not used to run anything: its `node_modules` are macOS builds and its PostgreSQL runs on macOS. **Re-run `npm run check`, `npm run test:db` and `npm run test:e2e` on the owner's machine** (PostgreSQL 17) before or during QA.

## 7. Test coverage

Unit (37 new):
- Decimal parsing and formatting (3 dp, separators, negatives, size).
- Kosovo-local dates across the DST change.
- Schemas and Albanian messages.
- Name normalization and identifier rules.
- Verification state derivation: precedence, stale identity, expiry, suspension and reinstatement.
- Permission rows P-14 (four-eyes), P-15 (accountant only), P-16 (read).

Database integration (45 new, real PostgreSQL, app connects as `alstore_app`):
- **Products**:
  - Create: canonical SKU, `12.500`, zero balance row, audit.
  - Idempotent replay and key reuse.
  - SKU case-insensitive duplicate, including concurrently.
  - Name and separator duplicate warnings with acknowledgement; barcode uniqueness.
  - Albanian field errors; DB SKU CHECK.
  - SKU immutable on update.
  - Optimistic concurrency between two users.
  - Unit free before movements and locked after (service and trigger).
  - Unit migration:
    - reason required; one pending request per product;
    - self-approval refused;
    - non-zero stock refused (message shows `5,000 kg`);
    - applied at zero with movements keeping `KG`; approval and audit rows;
    - old approval cannot be replayed;
    - open draft blocks it;
    - reject, cancel, already decided;
    - not needed without movements.
  - Search over 500 SKUs: ranking, < 500 ms, ë/ç, barcode, wildcard escaping, inactive filter, prefix index used.
  - MFA and disabled account; cross-org read, write and search.
- **Customers**:
  - Name and identifier requirement.
  - Unverified by default.
  - Duplicate identifier and name warnings.
  - No identifier values in audit.
  - Search.
  - Rules: accountant-only in service and trigger; required, length and digits; FORMAT_VALID only when fully ruled; retire, and retired rows immutable.
  - Manual verification: evidence required, past `valid_until` refused.
  - Eligibility: VG-07 gate.
  - Identity change invalidates; address change does not; expiry.
  - Suspension: double suspension, verify while suspended, reinstate and re-verify.
  - Failed check.
  - FOR SHARE vs suspension ordering.
  - OFFICIAL_SOURCE impossible in DB.
  - Stale edit; cross-org.
- **Suppliers**: XK/AL, EUR, identifiers by country, wrong country or identifier rejected, NIPT duplicate warning, versions, search, audit roles, DB EUR CHECK. SQL/TS name normalization parity.
- **Rollback**: 0002/0003 down and up.

E2E (Playwright, 4 viewports):
- Product create with Albanian errors and 3-dp price.
- Two consecutive edits on one page.
- Search; duplicate SKU and name confirmation; double tap creates one product.
- Locked unit and the full four-eyes migration (director requests, accountant approves).
- Customer requires identifier; unverified and not invoiceable with reasons; manual check disabled honestly; suspend; search; duplicate NUI warning.
- Rules page read-only for director, editable by accountant.
- Albanian supplier with NIPT and EUR.
- Touch-target heights; no horizontal overflow.
- Existing Phase 01 shell and login tests (placeholder test now excludes Klientët, Furnitorët and Stoku).

## 8. Security notes and known limitations

- **Dev preview actor** (see §2) is the main new risk. It is guarded by env validation (development + UI_PREVIEW + local DB), a strict same-site httpOnly cookie for the role choice, and DB-loaded role/status. Production and staging boot fails if the variables are set.
- MFA is not real anywhere yet; writes in the preview treat it as satisfied.
- Server actions rely on Next.js built-in origin checks (T-18); idempotency keys are UUIDs generated server-side per render.
- Audit `safe_details` hold field names, SKUs, units and states; customer and supplier identifier values only appear as hashes.
- Search uses parameterized SQL with escaped LIKE input; no `dangerouslySetInnerHTML`.
- `numeric(18,3)` silently rounds extra decimals, so the service rejects > 3 dp before the DB (tested).
- Screenshots contain synthetic data only.

## 9. BLOCKED / open items (carry forward)

| Item | Needs |
|---|---|
| Real login, sessions, MFA; removing/limiting the dev preview actor | Dev Supabase project (RG-03), owner is creating it |
| Recording a manual verification from the UI (evidence upload) | Private document storage (Supabase Storage, same project) |
| Which identifiers are mandatory and their formats; what evidence counts as verification; re-verification interval | Accountant: OLD-14 / VG-07 (enter as rules in `/klientet/rregullat`, approve VG-07) |
| Required billing fields on a buyer for invoices | Accountant: OLD-01 / VG-01 (before Phase 08) |
| Linking a customer and a supplier record of the same business | OWN-14 (owner); not requested in PROMPT 03 |
| Re-run of all checks on the owner's Mac (PostgreSQL 17) | Owner / QA |

## 10. Verdict

All PROMPT 03 requirements that do not depend on authentication or document storage are implemented and pass. That includes format, lint, typecheck, 106 unit tests, 88 database tests, build, 69 E2E tests and `verify-phase-00.mjs`. Real login and UI recording of manual verification are **BLOCKED** (RG-03).

**PARTIAL PASS — awaiting independent QA (`docs/QA_PHASE_03.md`).** Do not start PROMPT 04 until it records a verdict.
