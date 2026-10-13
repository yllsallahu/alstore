# PHASE 04 — Validated product import, physically confirmed opening stock, cutover setup

| | |
|---|---|
| Date | 2026-10-13 |
| Executed by | Claude (Anthropic) on a copy of the owner's working tree in a Linux sandbox; changed files written back to the owner's `alstore` folder |
| Spec | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` — PROMPT 04 |
| Predecessor | Phase 03 — QA **WAIVED BY OWNER** (`docs/QA_PHASE_03.md`), not an independent PASS |
| Database used | Local PostgreSQL **16.x** (`scripts/db-local.sh`). No Supabase project was contacted. `.env` files were not copied or opened. |
| Verdict (agent) | **PARTIAL PASS**: everything in scope is implemented and tested. Real login (RG-03) and private storage of the uploaded count sheet remain BLOCKED. Awaiting independent QA. Phase 05 was not started. |

## 1. What this phase delivers

### Product import (`/stoku/importi`)
- Owner-controlled CSV/XLSX upload inside the app. Limits: 2 MB, 2 000 rows, 30 columns, 500 characters per cell. CSV must be UTF-8; delimiter is detected (`;` or `,`).
- XLSX safety: the zip central directory is read before any library inflates data. Rejected: legacy/encrypted OLE files, non-zip data, truncated files, zip64, path traversal, macros, more than 200 entries, more than 25 MB uncompressed. Only the first visible sheet is read; formula cells are never evaluated and are always a row error. `.xls/.xlsm/.xlsb` are refused; extension and content must agree.
- **Dry run first.** Upload only stages the file and rows (`import_batches`, `import_batch_rows`) and suggests a column mapping from header names. No product, count line or stock movement exists until approval. The mapping can be corrected and the dry run repeats.
- Row validation reuses the Phase 03 product rules: SKU canonical and unique, category, unit only kg / m² / copë (no conversion, no guessing), barcode, reference price at 3 dp. Row numbers match the spreadsheet.
- Duplicates: the same SKU or barcode in the file or catalog is an ERROR on every involved row. Same display name, or a SKU that differs only by separators, is a WARNING that must be acknowledged.
- Approval: ALL_OR_NOTHING by default. REVIEWED_PARTIAL imports only the error-free rows and requires typing the exact number of excluded rows. The dry run is repeated **inside the approval transaction**; if the preview hash differs (catalog changed meanwhile) nothing is written, the preview is refreshed and `IMPORT_CHANGED` is returned. Reject keeps the batch for audit with no effect.
- The same file (SHA-256 of the bytes) is never staged twice; the existing batch is returned. Retries use the same idempotency key. Every step writes audit events.

### Opening stock (`/stoku/gjendja-fillestare`)
- Keyed by SKU and the product's canonical unit, quantities at 3 dp. Lines are **VERIFIED_QTY** (> 0), **VERIFIED_ZERO** (typed 0) or **UNKNOWN**. A blank cell is UNKNOWN, never zero. Nothing is inferred from AL/PVC totals or invoice totals; the UI says the file must be the physical count sheet, not the Excel stock list.
- Lines come from a typed form or from a count-sheet import (same pipeline as above, `OPENING_STOCK` kind). The import fills lines of a DRAFT batch only; unknown SKUs and unit mismatches are row errors and no product is created.
- State machine, enforced by a database trigger: DRAFT ⇄ COUNTED ⇄ RECONCILED → SIGNED_OFF → POSTED. Lines freeze at COUNTED.
  - Counted → the accountant records the reconciliation to the final Excel workday with a required note (≥ 10 characters). It is a REVIEWED approval bound to a hash of the lines (`app.opening_lines_hash`). P-23.
  - The director signs off (P-24) presenting the same hash and the exact number of products still without verified status. Four-eyes: the signer differs from the reconciler.
  - Sign-off and posting are **one transaction**: approval → SIGNED_OFF → plan LOCKED → one OPENING stock event with `effective_at` = the plan's cutover instant and `document_date` = the start date → one movement per VERIFIED_QTY line (source line id = immutable source-event reference) → balances → POSTED. Any failure rolls everything back (tested with an injected failure).
- Reopening a RECONCILED batch INVALIDATES the reconciliation approval; it is never deleted.
- **INV-08 backstop.** `app.stock_tracking_status(product)` is derived, never stored: KNOWN only after a POSTED opening batch and (verified line, or product created after posting, or approved OPENING_RESOLUTION adjustment). The movement guard now rejects sale, receipt and fulfillment-correction movements for any non-KNOWN product (SQLSTATE 55000), and `assertProductsTradable` is ready for the sales phases. Verified zero is KNOWN; UNKNOWN and uncounted products stay blocked.
- After POSTED everything is immutable: batch, lines, plan dates, the event and its movements (tested).

### Cutover setup (`/cilesimet/kalimi`)
- Intended start date (first of a month by default; another day needs an explicit acknowledgement of the accountant's period approach, OLD-19) and the last Excel workday. The cutover instant is computed in the database as midnight Europe/Belgrade of the start date and checked by a CHECK constraint. The DRAFT batch's counted-as-of day follows plan edits; dates freeze once counting completes.
- Invoice series: the last issued number for the chosen calendar year, or an explicit "no invoice issued this year". The year must equal the start date's year; a legacy number requires the last Excel day to be in that year. Stored as PROPOSED with next number = last + 1. **No invoice is issued, and no invoice number is allocated.** Approval of the continuation stays the accountant's later gate (VG-05).
- Old records are not imported as live transactions.

## 2. Decisions

- One opening batch per cutover plan (`opening_stock_batches_plan_uq`) in addition to one POSTED batch per organization.
- Permissions: P-31 (plan write, both roles) and P-44 (read imports, opening stock, plan, series) added to `ROLE_PERMISSION_MATRIX.md`; P-20/21 products import, P-22 count entry, P-23 accountant reconciliation, P-24 director sign-off, P-25 series.
- A blank quantity cell means UNKNOWN (safe default: blocked), a typed 0 means verified zero.
- The preview hash uses canonical JSON, so it does not depend on key order after a jsonb round trip (a bug found by the tests and fixed).
- Phase 03 touch points: `productHash` exported; `hasStockMovements` in the product service also returns true for a product on an opening count line, so its unit cannot change between counting and posting.
- `package.json` gains `exceljs 4.4.0` and an `overrides` entry `uuid ^11.1.1` to clear the moderate advisory on its transitive `uuid`; XLSX tests pass with it.
- Albanian wording reserved for the later correction (LEGACY_CUTOVER_PLAN §6): reason **"Gabim në numërimin fillestar"**, to be used by the Phase 05 adjustment screen.
- `next.config.ts`: server action body limit raised to 3 MB (default 1 MB would cut off 2 MB files).

## 3. Files

### Created
- Migrations: `drizzle/0004_import_and_opening_stock.sql`, `drizzle/0005_import_opening_stock_guards.sql` (hand-written guards), `drizzle/meta/0004_snapshot.json`, `0005_snapshot.json`, rollback `drizzle/rollback/0004_0005_down.sql`.
- Libraries: `src/lib/import/{errors,csv,zip-guard,fields,rows}.ts`, `src/lib/validation/{imports,opening}.ts`, `src/lib/opening-labels.ts`, `src/server/import/parse-file.ts`.
- Services: `src/server/services/imports/import-batches.ts`, `opening/opening-stock.ts`, `cutover/cutover.ts`, `inventory-tracking.ts`.
- UI: `src/app/(app)/stoku/importi/**`, `stoku/gjendja-fillestare/**`, `cilesimet/kalimi/**`, `src/components/forms/action-form.tsx`, `src/components/import/mapping-form.tsx`.
- Tests: `tests/unit/import-files.test.ts`, `tests/db/import-products.test.ts`, `tests/db/opening-stock.test.ts`, `tests/e2e/opening-stock.spec.ts`, screenshots `docs/screenshots/phase-04/`.

### Modified
Schema (`enums`, `_base`, `historical-migration`, `catalog-inventory`, `settings`, `sales-invoicing`), `permissions.ts`, `ROLE_PERMISSION_MATRIX.md`, `navigation.ts`, Stoku and Cilësimet pages, audit-history and saved-notice components, `next.config.ts`, `package.json`/lock, `tests/db/{rollback,structure}.test.ts` (61 tables), `tests/e2e/shell.spec.ts` (Cilësimet is no longer a pure placeholder), `tests/unit/permissions.test.ts`.

## 4. Migrations
- **0004** (generated): table `import_batch_rows`; new columns and CHECKs on `import_batches`, `opening_stock_batches`, `cutover_plans` (instant and mid-month CHECKs), `invoice_series`.
- **0005** (custom): `stock_tracking_status`, `opening_lines_hash`, extended `stock_movements_guard`, `stock_events_opening_guard`, `opening_stock_batches_transition`, `cutover_plans_guard`, `invoice_series_guard`, parent-frozen trigger for rows and lines, grants, RLS policy, same-organization triggers.

## 5. Rollback method
`drizzle/rollback/0004_0005_down.sql` restores the Phase 03 schema and the Phase 01 movement guard, rebuilds the same-organization triggers and forgets both migrations so `npm run db:migrate` re-applies them. It runs before the 0002/0003 and 0000/0001 scripts. It is valid only while no business data exists; once a batch is POSTED, fix forward instead. Tested up → down → up in `tests/db/rollback.test.ts`.

## 6. Commands actually executed (sandbox: Linux, Node v22, PostgreSQL 16)

| Command | Exit | Result |
|---|---|---|
| `npm run format:check` | 0 | clean |
| `npm run lint` | 0 | 0 warnings |
| `npm run typecheck` | 0 | — |
| `npm test` | 0 | 8 files, 130 tests passed |
| `npm run test:db` | 0 | 9 files, 136 tests passed |
| `npm run build` | 0 | production build succeeded |
| `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test` | 0 | 74 passed, 10 skipped (the one-time cutover flow runs on desktop only; mobile skips are by design) |
| `node scripts/verify-phase-00.mjs` | 0 | RESULT: PASS |
| `npm audit --omit=dev` | 1 → 0 | before the `uuid` override: 2 moderate advisories via exceljs; after: 0 vulnerabilities |

## 7. Test coverage
- **Unit (24 new):** CSV delimiter/BOM/quotes/row numbers; non-UTF-8, NUL, renamed zip, bad extensions, row/column/size limits; XLSX numbers and formula marker; zip guard (legacy, non-zip, truncated, macro, traversal, bomb); mapping; product and opening row rules; duplicates.
- **DB, product import (15):** dry run creates nothing; Albanian row errors; duplicates in file and catalog; all-or-nothing and reviewed partial; audit events; idempotent replay and same-file re-upload; concurrent approvals create each product once; changed catalog refreshes the preview and writes nothing; reject; remap; cross-organization isolation; MFA.
- **DB, opening/cutover/series (32):** instant at Kosovo midnight; mid-month acknowledgement; dates freeze; plan idempotency and MFA; series year/legacy rules and no invoice issued; guard on decided series; 0 vs blank vs UNKNOWN; freezing and reopening; count-sheet import (unit mismatch, unknown SKU, blank); roles for reconcile and sign-off; hash and unknown-count checks; DB refuses skipped reconciliation or forged sign-off; posting creates one event, movements and balances; second post rejected; idempotent replay; concurrent double post; immutability after posting; **injected failure rolls back everything and a retry succeeds**; UNKNOWN products blocked at the database; products created after posting are KNOWN.
- **E2E:** all four viewports without overflow and with ≥ 40 px controls; full desktop flow plan → series → import with an error row → count → reconcile (accountant) → sign-off (director) → everything frozen.

## 8. Security notes and known limitations
- Login is still BLOCKED (RG-03); the UI uses the development preview actor, never available outside a local database.
- The uploaded count sheet is not stored as a private attachment (private document storage is blocked, as in Phase 03). The batch keeps the file name, SHA-256, headers and every staged row for audit.
- Staged rows hold raw cell text from the owner's file; real files must stay out of the repository and logs. Audit details hold counts and SKUs only.
- Series approval (VG-05), sale blocking in the sales code and the stock balance screens belong to later phases; the database guard already enforces INV-08.
- exceljs is a large dependency; it is used only after the zip guard and only server-side.

## 9. BLOCKED / open items (carry forward)
- RG-03 Supabase Auth; private storage for count sheets; VG-05 series continuation approval; independent QA for Phases 02–04.

## 10. Verdict
**PARTIAL PASS (agent).** The scope is implemented and every command above passed. This is not an independent QA verdict; an independent `docs/QA_PHASE_04.md` is required before Phase 05.
