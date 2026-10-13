# QA PHASE 00 — Independent review

| | |
|---|---|
| Date | 2026-10-13 |
| Reviewer | Independent QA agent (did not author Phase 00) |
| Phase under review | PROMPT 00 — Scope freeze, architecture, transactional and compliance blueprint |
| Inputs reviewed | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` (full), `rules.md`, all 15 files in `docs/`, `README.md`, `CLAUDE.md`, `.cursor/rules/al-store-v7.mdc`, `.env.example`, `.gitignore`, `.nvmrc`, `.editorconfig`, `package.json`, `package-lock.json`, `scripts/verify-phase-00.mjs` |
| Basis | A read-only snapshot of the working tree, copied from the owner's computer on 2026-10-13. `.git`, `node_modules` and the real `.env` were not provided. The git facts listed in §1.2 were reported from the owner's machine and **not** independently verified. |
| **Verdict** | **PASS** after re-review (§7, 2026-10-13). The initial review was **FAIL** (4 Major: QA00-01 … QA00-04); all four are RESOLVED. 5 new Minor items (QA00-R1 … QA00-R5) and 3 Info items remain; they can be fixed in place without another review. PROMPT 01 may start (see §7.5). |

The scaffold itself is clean. The verify script passes, nothing is out of scope, no secrets appear in the authored files, the banned secondary-location name is absent, the Albanian strings are spelled correctly, no legal figures are guessed, and the architecture lock is a verbatim copy. The failure comes from three design contradictions in the binding transaction and inventory contracts, and from a missing evidence record in `PHASE_00.md`.

---

## 1. Commands run and their actual exit codes

### 1.1 Run by this reviewer (Linux sandbox, Node v22.22.0, git 2.43.0, PostgreSQL 16.15 server binaries)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | Copied the snapshot to a scratch dir, ran `git init`, and created a dummy `.env` (non-secret value) | 0 | Scratch git repo. All files are untracked but visible to git, matching the owner's `git status` for the authored files |
| 2 | `node scripts/verify-phase-00.mjs --scope` (= `npm run verify:phase-00`) | **0** | `RESULT: PASS`. 15/15 docs present; cross-references VG 18, OLD 23, OWN 15, RG 15, PG 21, CMD 23, INV 23, T 30, P 56, C 10, F 18, SOD 5, all defined; banned term absent; no secret patterns; `.env` ignored; no `src/ app/ drizzle/ migrations` |
| 3 | `node scripts/verify-phase-00.mjs` (= `npm run verify:docs`) | **0** | `RESULT: PASS` |
| 4 | `tail -n +9 docs/ARCHITECTURE_LOCK.md \| diff -q - rules.md` | **0** | Body is byte-identical to `rules.md` |
| 5 | `grep -rliE '<banned-name regex>' --exclude=AL_STORE_V7_CURSOR_MASTER_PROMPTS.md .` | **1** (no match) | Banned name absent from every file except the governing spec (it is not in `rules.md` either) |
| 6 | `grep -rnE '\b(Lesho\|faturen\|eshte\|perseri\|pergatitet\|numerimin\|DOREZIM\|FATURE\|regjistruara ne)\b' docs README.md CLAUDE.md .cursor` | **1** (no match) | No Albanian strings with missing ë/ç found |
| 7 | `grep -rnE '[0-9]+([.,][0-9]+)? ?%' docs README.md CLAUDE.md .cursor .env.example` | **1** (no match) | No percentage rates stated anywhere |
| 8 | `bash qa-evidence/verify-negative-tests.sh <snapshot> <scratch>` (14 seeded-defect cases, see §1.3) | **0** (harness) | 6 defects detected, **8 not detected** (detector gaps, QA00-15) |
| 9 | `bash qa-evidence/db-design-probes.sh <scratch>` (throw-away PostgreSQL 16 cluster, synthetic rows) | **0** (harness) | P1: row lock on an immutable invoice is **denied** (QA00-01). P2a/P2b/P3: the idempotency and gapless-counter design behaves as documented. P4: unique violation 23505 (QA00-07). P5: deadlock 40P01 (QA00-08) |

**Not run, because they do not exist yet:** formatter, lint, strict typecheck, app build, unit tests, DB integration tests, application concurrency tests, authorization tests and Playwright. `package.json` contains only the two `verify:*` scripts and has no dependencies. No result is claimed for any of them. Screenshots are not applicable (there is no UI).

### 1.2 Facts reported from the owner's machine (not re-executed by this reviewer)

- `npm run verify:phase-00` exited 0 with `RESULT: PASS`. This is **not** recorded in `PHASE_00.md` (QA00-03).
- `git status --short` shows `.gitignore`, `package.json` and `package-lock.json` as modified, with the authored files untracked. Nothing was committed or pushed by the agent.
- The real `.env` is gitignored, and `git log --all -- .env` is empty.
- `npm uninstall cypress` (exit 0) and `rm -rf cypress cypress.config.js` (exit 0) were run on owner instruction.

### 1.3 Negative tests of the verify script (command #8)

| Case | Seeded defect | Expected | Actual exit |
|---|---|---|---|
| N1 | Banned name in `docs/SCOPE.md` | 1 | 1 ✔ |
| N2 | Fake `sb_secret_` token in `deploy/run.sh` | 1 | **0** ✘ |
| N3 | Same token in `Dockerfile` | 1 | **0** ✘ |
| N4 | Same token in `data/keys.csv` | 1 | **0** ✘ |
| N5 | Banned name in `data/products.csv` (spec A.2 bans it in imports too) | 1 | **0** ✘ |
| N6 | Business code `lib/invoice.ts` under `--scope` | 1 | **0** ✘ |
| N7 | SQL migration `db/0001_init.sql` under `--scope` | 1 | **0** ✘ |
| N8 | `pages/index.tsx` under `--scope` | 1 | **0** ✘ |
| N9 | `docs/ARCHITECTURE_LOCK.md` edited so it no longer matches `rules.md` | 1 | **0** ✘ |
| N10 | `.env` removed from `.gitignore` | 1 | 1 ✔ |
| N11 | Undefined reference `VG-99` | 1 | 1 ✔ |
| N12 | Quoted secret value in `.env.example` | 1 | 1 ✔ |
| N13 | `src/a.ts` under `--scope` | 1 | 1 ✔ |
| N14 | Not a git repository | 1 | 1 ✔ |

### 1.4 DB design probes (command #9), against real PostgreSQL 16 using the role and privileges the docs prescribe

| Probe | What it tests | Observed |
|---|---|---|
| P1 | `SELECT … FOR UPDATE / FOR NO KEY UPDATE / FOR SHARE / FOR KEY SHARE` on `tax_invoices` as the app role, with UPDATE not granted (DATABASE_TRANSACTION_BOUNDARIES §7) | All four fail with `ERROR: permission denied for table tax_invoices` (psql exit 1) |
| P1b | Locking a separate mutable `settlement_targets` row instead | Works (exit 0) |
| P2a | Same idempotency key from a second session while the first transaction is open, and the first then commits | The second session blocks, then `ON CONFLICT DO NOTHING` returns no row and sees `COMPLETED`, as DTB §2.4 says |
| P2b | Same, but the first transaction rolls back | The second session claims the key, as documented |
| P3 | Counter after a rolled-back `UPDATE invoice_series SET next_number = next_number + 1` | Unchanged (151). The gapless claim holds |
| P4 | Two concurrent first receipts for a SKU that has no `stock_balances` row | Both lock 0 rows; the second fails with `23505 duplicate key … stock_balances_pkey`, which is not in the DTB §2.8 retry list |
| P5 | Two postings that take `tax_periods` `FOR SHARE` and then upgrade to `FOR UPDATE` (CMD-19 invalidation path) | `ERROR: deadlock detected` (40P01) |

The evidence scripts are in `qa-evidence/`. They use synthetic data only, and the banned name and the fake token are assembled at runtime, so neither file contains them literally.

---

## 2. Findings

Severity key: **Major** = must be fixed before PROMPT 01 starts. **Minor** = can be fixed in place without re-review. **Info** = optional.

| ID | Severity | File (line) | Finding | Precise remedy |
|---|---|---|---|---|
| QA00-01 | **Major** | `docs/DATABASE_TRANSACTION_BOUNDARIES.md` §4 item 7 (line 47), §5 CMD-04 (line 62), CMD-11 step 3 (line 115), §7 (line 154) | The lock protocol cannot be implemented with the privileges the same document prescribes. §4.7 says to lock "Allocation targets (invoices, …) — `FOR UPDATE ORDER BY target_type, id`". §7 says "revoked `UPDATE/DELETE` on … `tax_invoices(+lines)`, issued correction documents, `payments`". PostgreSQL requires UPDATE privilege for every row-locking clause, and probe P1 shows `permission denied` for all four lock strengths. An implementer must then either grant UPDATE, which weakens immutability, or drop the lock, which reopens the F-13 double-allocation race. Separately, CMD-04 (correction document) does not lock the original invoice at all. A credit note committed at the same time as a payment allocation can therefore leave Σ allocations greater than outstanding. | Add a mutable lock row per settlement target to DOMAIN_MODEL §3.9: `settlement_targets(target_type, target_id)` PK, inserted in the same transaction that creates each issued invoice, debit document, purchase invoice, expense, historical obligation or refund liability. Replace DTB §4 item 7 with: "7. `settlement_targets` rows of every allocation/correction target — `FOR UPDATE ORDER BY target_type, target_id`. Issued documents themselves are never row-locked; the app role has no UPDATE privilege on them." Add to CMD-04: "lock the original invoice's `settlement_targets` row `FOR UPDATE` (level 7) before computing the correction's effect on outstanding". CMD-11, CMD-12 and CMD-13 lock the same rows. Probe P1b shows this works. |
| QA00-02 | **Major** | `docs/INVENTORY_INVARIANTS.md` INV-08 (line 36); `docs/DATABASE_TRANSACTION_BOUNDARIES.md` CMD-02 step 5 (line 93), CMD-08 (line 120); `docs/SCOPE.md` §4 (line 67); `docs/LEGACY_CUTOVER_PLAN.md` §6 (line 61) | The inventory contract permanently blocks every product created after cutover. INV-08 says "A SKU with opening status UNKNOWN **(or never part of the posted opening batch)** cannot be sold or received", and CMD-08 requires "products must have known opening status". A SKU added after go-live is never in the opening batch, so it can never be received or sold. This contradicts `PHASE_DEPENDENCIES.md` line 77 ("Data allowed after go-live: … additional customers/products"). There is a second gap: UNKNOWN is "resolved via an approved OPENING_RESOLUTION adjustment", but the posted opening batch is immutable, and no document says how resolution changes the status that CMD-02 and CMD-08 check. | Define one derived product attribute, `stock_tracking_status ∈ {KNOWN, UNKNOWN}`. A product is KNOWN if its posted opening line is VERIFIED_QTY/VERIFIED_ZERO, **or** it was created after the opening batch was POSTED (starts at 0.000, with the creation audited as "new SKU, nothing on hand"), **or** an approved OPENING_RESOLUTION adjustment exists for it. Replace INV-08 with: "A SKU whose `stock_tracking_status` is UNKNOWN (listed UNKNOWN or absent in the posted opening batch while it existed before cutover, and not yet resolved by an approved OPENING_RESOLUTION adjustment) cannot be sold or received. Products created after the opening batch is POSTED start KNOWN with on_hand 0.000." Make the same wording change in CMD-02 step 5, CMD-08, SCOPE §4 ("Whether a SKU may be sold at all") and LEGACY_CUTOVER_PLAN §6. |
| QA00-03 | **Major** | `docs/PHASE_00.md` line 9 (verdict), line 93 (command #10), lines 95-96 (§6.1) | The phase record claims PASS without recording the final run of its only runnable check. Command #10 says "see §6.1", and §6.1 says "_Recorded after the final run — see below._" but nothing follows. Spec §B and gate PG-00 require recorded real commands and exit codes, including "`npm run verify:phase-00` exit 0". This reviewer independently got exit 0 on the snapshot (§1.1 #2), but the phase record itself is incomplete. | Re-run `npm run verify:phase-00` on the owner's machine **after** all QA fixes. Record the real outcome in §6 row 10 and §6.1, for example "\| 10 \| owner's computer \| `npm run verify:phase-00` \| 0 \| RESULT: PASS — sections 1–6 ok \|", using only the actual output. Remove the placeholder sentence. |
| QA00-04 | **Major** | `docs/DOMAIN_MODEL.md` §3.9 `customer_refund_liabilities` (line 125), derived outstanding (line 129); `docs/FINANCIAL_DOCUMENT_STATES.md` §5 (line 62) | Spec P09 requires handling credit corrections on "already paid, partially paid" invoices, and the documents contradict each other on how. DOMAIN_MODEL makes a refund liability `source_payment_id U` and "Created only by explicit user confirmation of an overpayment". FINANCIAL_DOCUMENT_STATES §5 says a credit on a paid invoice turns the "resulting customer excess" into a refund liability. A credit-sourced liability has no source payment, so the entity cannot represent it. Meanwhile outstanding (= gross + debits − credits − allocations) goes negative, which violates the stated invariant "Σ allocations on a target ≤ target outstanding". | In DOMAIN_MODEL, replace `source_payment_id U` with `(source_type ∈ {PAYMENT_OVERPAYMENT, CREDIT_AFTER_SETTLEMENT}, source_id) U`. Add to CMD-04: "compute outstanding after the credit under the QA00-01 lock; if it would be < 0, require explicit `excess_action = CREATE_REFUND_LIABILITY` in the payload (otherwise reject `CREDIT_EXCEEDS_OUTSTANDING`); production use stays behind VG-08/VG-16 (OLD-06, OLD-15)". Add failure case F-19: "credit note issued concurrently with a payment allocation on the same invoice → serialized; outstanding never < 0 without a recorded liability". |
| QA00-05 | Minor | Several files (stale after the Cypress addendum) | Statements were not updated after Cypress was removed:<br>`SCOPE.md`:151 "documented (C-02), not removed." and :152 "Same as above.";<br>`PHASE_00.md`:22 "…; not removed", :74 lists `cypress/`, `cypress.config.js`, `package-lock.json` as **Not changed** (git shows `package-lock.json` modified), :108 still lists "OWN-11 Cypress removal approval \| Phase 01" as a blocker;<br>`ADR_001_TECH_STACK.md`:31 "Cypress currently in repo";<br>`ARCHITECTURE_LOCK.md`:5 (header, not the verbatim body) "not the Cypress currently installed";<br>`OPEN_LEGAL_DECISIONS.md`:51 default "Remove in Phase 01" and :3 "Status: **All OPEN**" although OWN-11 is DECIDED;<br>`PHASE_DEPENDENCIES.md`:52 "OWN-11 (Cypress)";<br>`.gitignore`:12-15 "Cypress artifacts" block. | SCOPE:151 → "\| `package.json` \| Had only a `cypress` devDependency \| Removed 2026-10-13 on owner instruction (C-02, OWN-11); no dependencies remain. \|". SCOPE:152 → "… \| Deleted 2026-10-13 (C-02). \|". PHASE_00:22 → "…; removed after delivery on owner instruction (§11)". PHASE_00 §4: move `package-lock.json` (rewritten by `npm uninstall cypress`) and `cypress/`, `cypress.config.js` (deleted) out of "Not changed" into Modified/Deleted. PHASE_00:108 → delete the row. ADR:31 → "Cypress removed 2026-10-13 (OWN-11)". ARCHITECTURE_LOCK:5 → "Playwright (Cypress was removed on 2026-10-13, OWN-11)". OLD:51 → "Removed in Phase 00 addendum (2026-10-13)". OLD:3 → "Status: all OLD-xx OPEN; OWN-xx OPEN except OWN-11 (DECIDED)". PHASE_DEPENDENCIES:52 → "—". Delete `.gitignore` lines 12-15. |
| QA00-06 | Minor | `docs/DATABASE_TRANSACTION_BOUNDARIES.md` §2 step 3 (line 15) | "Session settings: `lock_timeout` (≈5 s), `statement_timeout`, `idle_in_transaction_session_timeout`". ADR-001 explicitly allows the Supabase transaction pooler. Under that pooler, session-level `SET` is either lost or leaks to other clients. | Replace with: "Per-transaction settings issued right after `BEGIN`: `SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '<n>s'; SET LOCAL idle_in_transaction_session_timeout = '<n>s'` (pooler-safe; never session-level `SET`)." |
| QA00-07 | Minor | `docs/DOMAIN_MODEL.md` `stock_balances` (line 78); `docs/INVENTORY_INVARIANTS.md` §2 OPENING row (line 17); DTB §2.8 (line 23) | A product with no balance row (for example VERIFIED_ZERO, where no OPENING movement is posted) has nothing to `FOR UPDATE`. Two concurrent first postings both insert, and the second fails with `23505` (probe P4), which is not retried. The user sees an unexplained failure on a legitimate receipt. | Add to DOMAIN_MODEL `stock_balances`: "Exactly one row per product, inserted with on_hand 0.000 in the same transaction that creates the product; posting commands lock existing rows only." Alternatively, add "`23505` on `stock_balances_pkey`" to the bounded-retry list in §2.8. |
| QA00-08 | Minor | DTB CMD-02 step 7 (line 95) vs CMD-19 bullet 2 (line 125); `ROLE_PERMISSION_MATRIX.md` P-91 (line 79) | (a) Postings take the period `FOR SHARE` and then upgrade to `FOR UPDATE` to invalidate a review. Two concurrent postings deadlock this way (probe P5, 40P01). (b) CMD-02 says an invoice can never land in a non-OPEN period, while CMD-19 says a tax-relevant posting into a reviewed period reopens it. The exception is implied but never stated. (c) P-91 allows marking the current month READY_FOR_ACCOUNTANT_REVIEW before it ends, which would silently block all issuance for the rest of the month. | (a) Add to CMD-19: "Read period status without a lock; if OPEN take `FOR SHARE` and re-check; otherwise take `FOR UPDATE` directly. Never upgrade SHARE→UPDATE." (b) Add to CMD-02 step 7: "Exception to CMD-19: issuance never reopens a period; it is rejected with `PERIOD_NOT_OPEN`." (c) Add to P-91: "only after the period's last calendar day (Europe/Belgrade)". |
| QA00-09 | Minor | DTB F-17 (line 148); `DOMAIN_MODEL.md` §1 principle 5 (line 14) | F-17 says `document_date` comes "from DB clock … at commit", but `now()` returns the transaction start time. Principle 5 says `document_date` is "set server-side, never trusted from the client", which contradicts supplier invoice, DUD and expense dates. Those are necessarily user-entered (`purchase_invoices.invoice_date`, `expenses.document_date`). | F-17 → "`document_date` from the DB clock (`now()`, i.e. transaction start) in `Europe/Belgrade`; deterministic per transaction". Principle 5 → "…set server-side for documents AL STORE issues (invoices, corrections, fulfillments); dates of third-party documents (supplier invoices, DUD, expenses) are user-entered and validated against cutover and period status (T-13)." |
| QA00-10 | Minor | `ROLE_PERMISSION_MATRIX.md` SOD-1 (line 96), SOD-3 (line 98); DTB §7 (line 157); INV-20 (line 48); `DOMAIN_MODEL.md` `stock_movements` (line 77), INV-10 (line 38) | (a) Several rules claim a "DB CHECK" that compares two different rows or tables, for example `approver_id <> reviewer_id` across two approval rows. PostgreSQL CHECK can only reference columns of the same row. (b) `U(source_type, source_line_id)` on `stock_movements` and the INV-10 partial index "`WHERE movement type = OPENING`" use columns that exist only on `stock_events`. | (a) Reword to: "enforced by a same-row CHECK (requester/reviewer id copied onto the approval row) or a BEFORE INSERT constraint trigger". (b) Add `source_type` and `movement_type` (denormalized, immutable) to `stock_movements` in DOMAIN_MODEL §3.4. |
| QA00-11 | Minor | `RELEASE_GATES.md` line 3, line 73; `DOMAIN_MODEL.md` `release_gates` (line 58); `FINANCIAL_DOCUMENT_STATES.md` §15 (line 154); `PHASE_00.md` line 106 | (a) The gate status vocabularies differ. RELEASE_GATES uses `PASS/APPROVED, FAIL`; DOMAIN_MODEL and FIN §15 use `APPROVED/BLOCKED/REVOKED`. RG rows live in the same `release_gates` table. (b) RG-20 requires "RG-00…RG-19 PASS/APPROVED", but RG-04…RG-09 do not exist. (c) PHASE_00 §7 says RG-02 blocks **Phase 01**, while RELEASE_GATES §3 says the RG-0x gates must be met before **Phase 02**. | (a) Use one enum everywhere: `NOT_STARTED, EVIDENCE_PENDING, APPROVED, FAILED, BLOCKED, REVOKED`. State that PG-xx phase gates are QA verdicts (PASS/FAIL/BLOCKED) and are not stored in `release_gates`. (b) Change to "RG-00…RG-03 and RG-10…RG-19". (c) Choose one. Recommendation: RG-02 before Phase 01, as PHASE_00 says, and add that to the RELEASE_GATES §3 heading. |
| QA00-12 | Minor | `LEGACY_CUTOVER_PLAN.md` line 41, line 27 | (a) The runbook says "tax gates VG-01…VG-08, VG-14 approved", which omits VG-17. VG-17 is in the CMD-02 issuance set (VAT_COMPLIANCE_GATES §3). (b) "the period of D must combine legacy and AL STORE documents in one declaration" states a legal conclusion as fact, contrary to "no legal guessing". | (a) → "all gates of the issuance set (VAT_COMPLIANCE_GATES §3: VG-01…VG-08, VG-14, VG-17) approved". (b) → "the period of D would contain both legacy and AL STORE documents; how that month's books and declaration must be prepared is OLD-19 and is not assumed here." |
| QA00-13 | Minor | `ROLE_PERMISSION_MATRIX.md` P-98 (line 86), P-81 (line 73), P-07 (line 32) | (a) P-98 is marked ✅¹ for both roles, but the note says "accountant reason + director approval". Read by the legend, a DIRECTOR request would be approved by the ACCOUNTANT. (b) P-81 does not say who confirms a cash record that the accountant entered herself. (c) P-07 gives DIRECTOR "❌ for tax gates", yet VG-06 (Director + accountant), VG-11 ("+ director to activate") and VG-18 (Owner + legal advisor) need director action. | (a) P-98 → DIRECTOR "✅ (approve only)", ACCOUNTANT "✅ (request with reason only)". (b) Add: "a cash record entered by the ACCOUNTANT counts as accountant-confirmed (audited)", or route it to the director. Mark as owner decision OWN-16. (c) P-07 DIRECTOR → "✅ for RG-xx, VG-06 (joint), VG-11 activation, VG-18; ❌ for other VG gates". |
| QA00-14 | Minor | `.env.example` lines 6, 15, 19, 20 | The file puts comments on the same line after values, e.g. `APP_ENV=development                     # development \| …`, `SUPABASE_SECRET_KEY=                    # server-only…`. dotenv strips these, but Docker `--env-file` and other literal loaders do not, and the lock prescribes Docker on Render. An "empty" secret would become the comment text, and `APP_ENV` would not equal `development`. | Move every comment to its own line above the variable, leaving `APP_ENV=development`, `SUPABASE_SECRET_KEY=`, `DATABASE_URL=`, `DATABASE_MIGRATION_URL=`. |
| QA00-15 | Minor | `scripts/verify-phase-00.mjs` lines 43, 99, (missing check) | The negative tests (§1.3) show 8 false PASS results. The secret and banned-term scans only read an extension allowlist, which excludes `.sh`, `Dockerfile` and `.csv` (N2–N5). `--scope` only blocks `src/ app/ drizzle/ supabase/migrations` (N6–N8). Nothing checks that `ARCHITECTURE_LOCK.md` still matches `rules.md`, even though rules.md §11 warns against "contradictory duplicate rule files" (N9). `CLAUDE.md` makes this script the gate for every future phase. | (1) Scan every git-visible file that is not binary (NUL-byte check), not an extension allowlist. (2) Under `--scope`, fail on any path outside an explicit Phase 00 allowlist (`docs/`, `scripts/verify-phase-00.mjs`, root config/instruction files, `.agents/`, `.cursor/`) and when `package.json` declares any dependency. (3) Add a check that `docs/ARCHITECTURE_LOCK.md` from line 9 on is byte-identical to `rules.md`. (4) Re-run `qa-evidence/verify-negative-tests.sh`: every case must print `OK`. |
| QA00-16 | Minor | `ADR_001_TECH_STACK.md` (line 12 only); `THREAT_MODEL.md` T-14 | Spec §B requires "encrypted private document storage". Apart from being quoted in the ADR context, no decision or mitigation addresses it. | Add to the ADR decision table and T-14: "Encryption in transit (TLS) and at rest for PostgreSQL, Storage objects and backups must be confirmed from provider documentation (URL plus retrieval date) and recorded in Phase 19; not assumed." |
| QA00-17 | Info | `SCOPE.md` line 156; `PHASE_00.md` line 26 | The GitHub account handles of both remotes are written out. That is acceptable in a private repo, but they are personal identifiers. | Optionally replace them with `<origin-owner>/alstore` and `<upstream-owner>/alstore`. |
| QA00-18 | Info | DTB CMD-02 step 2 (line 90) vs §4 level 8 (line 49) | Gates are checked before the sale row (level 2) is locked, while §4 places `release_gates` at level 8, "FOR SHARE where a concurrent revoke must be serialized". This is harmless if the read takes no lock. | State: "gate rows are read without row locks; a revocation applies to transactions that start after it commits", or move the check after level 7. |
| QA00-19 | Info | DTB line 104 | Spec A.4 "exactly one stock-out movement" is interpreted as one stock event with one line per SKU. The interpretation is reasonable and openly recorded, but it reinterprets a locked decision. | Add an OWN item for the owner to acknowledge it. |
| QA00-20 | Info | `rules.md` §12 vs `PHASE_00.md` §2 | rules.md §12 asks for an "architecture compliance report" and the "missing environment variables". The substance is spread across PHASE_00 §2, SCOPE §8 and `.env.example`, and there is no explicit list of what the local `.env` still lacks. | Optionally add a short PHASE_00 subsection that names, without values, what is still missing: `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `APP_ENV`, the kill switches, `SENTRY_DSN`, separate staging/prod projects, MFA enabled and signup disabled in Supabase Auth. |

### Verified as correct (no finding)

- **Scope:** the snapshot has no `src/`, `app/`, `drizzle/`, `supabase/`, `lib/`, `pages/`, `*.ts`, `*.tsx` or `*.sql`, no dependencies, no schema or migrations, no UI and no tax issuance.
- **Banned secondary-location name:** absent from every authored file, and from `rules.md`. It appears only in the governing spec.
- **No legal guessing:** no VAT rate, percentage, cash threshold, invoice field list, filing deadline or template layout is stated as fact. Every such item is an OLD-xx question with a gate. The ATK links are labelled as references to re-verify. One soft assertion is noted in QA00-12(b).
- **Albanian strings are correct:** "Borxhet e regjistruara në AL STORE", "JO PËR DORËZIM", "Eksporti ATK është në pritje të verifikimit", "Lësho faturën", "PARAPAMJE – JO FATURË", "PDF po përgatitet", "provoni përsëri", "gabim në numërimin fillestar", "Lëshimi i faturave është i bllokuar deri në miratimin e kontabilistit", "regjistruar në AL STORE", and the home actions Shitje e re / Blerje e re / Stoku / ATK / EDI.
- **Secrets:** no keys, tokens, project refs, passwords or connection strings in authored files. `.env.example` has names only, and both kill switches are `false`.
- **Architecture lock:** `docs/ARCHITECTURE_LOCK.md` body equals `rules.md`. `CLAUDE.md` and `.cursor/rules/al-store-v7.mdc` point to it (rules.md §11).
- **Transaction design:** in-transaction idempotency claim, replay or 409 behaviour, and the gapless locked counter, confirmed on real PostgreSQL (P2a, P2b, P3). There is no `MAX()+1` and no SEQUENCE.
- **Kosovo time zone:** using IANA `Europe/Belgrade` is consistent with the IANA database having no separate Kosovo zone.

---

## 3. PROMPT 00 requirement checklist

| Requirement | Status | Where / note |
|---|---|---|
| 13 docs: SCOPE, DOMAIN_MODEL, ROLE_PERMISSION_MATRIX, DATABASE_TRANSACTION_BOUNDARIES, INVENTORY_INVARIANTS, FINANCIAL_DOCUMENT_STATES, LEGACY_CUTOVER_PLAN, VAT_COMPLIANCE_GATES, THREAT_MODEL, ADR_001_TECH_STACK, PHASE_DEPENDENCIES, RELEASE_GATES, OPEN_LEGAL_DECISIONS | Met | All present and substantive |
| rules.md §11: `docs/ARCHITECTURE_LOCK.md` plus Cursor/Claude instruction integration | Met | Verbatim. Drift is not checked (QA00-15) |
| Inspect repo before changing it; avoid duplicate work | Met | PHASE_00 §2, SCOPE §8. Stale after the addendum (QA00-05) |
| Separate entities: sale, physical delivery, B2B tax invoice, purchase, stock receipt, corrective documents, cash/bank payment, payment refund, opening stock, historical invoice references, expenses, import/DUD, tax books | Met, with defect | DOMAIN_MODEL §3, §5. Refund liability arising from a credit cannot be represented (QA00-04) |
| Which operations are atomic and idempotent | Met, with defects | DTB §5 (CMD-01…23). Lock/privilege contradiction (QA00-01); QA00-06/07/08 |
| Last-Excel-day cutover | Met | LEGACY_CUTOVER_PLAN §2, §5, §6 |
| First-of-month preference | Met | LEGACY §2, §3 (mixed-month case → OLD-19) |
| Last used invoice number | Met | LEGACY §2, §5, §7; OWN-03; VG-05 |
| Year-specific invoice series | Met | DOMAIN_MODEL `invoice_series`; FIN §4; LEGACY §7; F-11 |
| Post-launch historical receivables/payables imports | Met | LEGACY §8, §9; DOMAIN_MODEL §3.10 |
| Restricted "recorded debts" reporting | Met | LEGACY §10 (heading without a banner, restricted progress view, export metadata) |
| Accountant review → director final approval | Met | FIN §10, §16; ROLE P-91…P-97, SOD-1/2/4. Wording issues in QA00-10/13 |
| Source of truth | Met, with defect | SCOPE §4. Sellability rule is wrong for new SKUs (QA00-02) |
| User journeys | Met | SCOPE §6 (J-1…J-9) |
| Critical failure handling | Met, with defects | SCOPE §7; DTB §6 (F-01…F-18). F-17 wording (QA00-09); F-19 missing (QA00-04) |
| No legal guessing | Met | One soft assertion (QA00-12b) |
| External approvals that block tax release | Met | VAT_COMPLIANCE_GATES §4; RELEASE_GATES §5 |
| Documentation plus minimal safe scaffold only; no business modules or tax issuance | Met | Verified (§1.1 #2, §2 "Verified as correct") |
| Record outputs and stop | **Not met** | PHASE_00 §6.1 is empty (QA00-03) |

### Locked decisions (spec §A) respected in the design

| Decision | Status |
|---|---|
| Kosovo B2B only (no B2C/POS/fiscal receipts) | ✔ SCOPE §3; T-26 |
| One stock (no location column; banned name absent) | ✔ INVENTORY §1 |
| Units kg / m² / copë, no conversion | ✔ DOMAIN_MODEL `products.unit`; INV-05 |
| 3-dp quantities and unit prices; 2-dp EUR; rejected, not rounded, on input | ✔ DOMAIN_MODEL §1.4; DTB §2.2; rounding policy deferred to VG-03 |
| No negative stock | ✔ INV-02 (service check plus `CHECK (on_hand >= 0)`) |
| Accountant reviews, director approves ATK | ✔ P-92/P-93, SOD-1/2 |
| DUD/import kept separate from the supplier invoice | ✔ DOMAIN_MODEL §3.7, `document_links` roles |
| No double tax postings; no Excel-history guessing | ✔ `book_lines` source whitelist; historical obligations excluded; LEGACY §1 |
| Official ATK export blocked unless verified; "JO PËR DORËZIM" preview | ✔ VG-12; FIN §14; P-95 |
| Immutable issued invoices | ✔ by design. QA00-01 must be fixed so that locking does not force UPDATE grants |

---

## 4. Blockers for later phases (project prerequisites, **not** Phase 00 defects)

These items cannot be produced by development work. They are correctly identified by Phase 00 and are listed here so they are not lost.

| Item | Status | Blocks |
|---|---|---|
| RG-00 / OWN-01: owner formally accepts V7 as replacing V6 | NOT_STARTED | Phase 02 |
| RG-01 / OWN-07: both remotes confirmed private, collaborators reviewed, Pages disabled (could not be verified from the agent environment) | NOT_STARTED | Pushing any business code; Phase 02 |
| RG-02: commit the spec and `rules.md` (still untracked) | NOT_STARTED | Phase 01 per PHASE_00 §7 (see QA00-11c) |
| RG-03 / OWN-08: identify which Supabase project the local `.env` points to (must not be production); plan separate staging and prod projects | NOT_STARTED | Phase 02 |
| OLD-01…OLD-23, VG-01…VG-18 (accountant, legal) | All OPEN / NOT_STARTED | Tax features (Phases 06–16), real issuance, go-live. Phase 01 is not blocked |
| OWN-02…OWN-06, OWN-09, OWN-10, OWN-12…OWN-15 | OPEN | Phases 03, 04, 07, 08, 13, 17 as listed in OPEN_LEGAL_DECISIONS §2 |

---

## 5. Source files changed by this QA

- **Repository:** none. The snapshot is read-only, and no fix was applied, because every finding is a document change that the Phase 00 author or owner should make in the real working tree.
- **Created, outside the repository:**
  - `docs/QA_PHASE_00.md` (this report)
  - `qa-evidence/verify-negative-tests.sh`
  - `qa-evidence/db-design-probes.sh`

  Both scripts are reproducible, use synthetic data only, and contain no literal banned name or token. They can be ported into the Phase 02/05 test suites. In particular, P1/P1b, P4 and P5 should become integration tests once the schema exists.

## 6. Next-phase readiness (initial review — superseded by §7.5)

**NOT READY. Do not start PROMPT 01.**

To reach PASS:

1. Apply the remedies for **QA00-01, QA00-02, QA00-03 and QA00-04**. Applying the Minor remedies QA00-05 … QA00-16 at the same time is recommended, and they do not need separate re-review.
2. Update `docs/PHASE_00.md` §4 with the changed files, then re-run `npm run verify:phase-00`. Record the real command, exit code and output summary in §6.1.
3. If QA00-15 is fixed, re-run `qa-evidence/verify-negative-tests.sh` and record that every case reports `OK`.
4. Request a focused re-review covering QA00-01 … QA00-04 and the updated PHASE_00 evidence. When that review passes, update this file's verdict to PASS.

RG-02 should also be completed before Phase 01. RG-00, RG-01 and RG-03 must be completed before Phase 02.

---

## 7. Re-review (2026-10-13)

**Scope:** a focused re-review of QA00-01 … QA00-04 and the updated `PHASE_00.md` evidence, with spot checks of the Minor and Info fixes. It was done against a refreshed read-only snapshot copied from the owner's computer after the remediation. That snapshot now contains this report at `docs/QA_PHASE_00.md` and the evidence scripts under `scripts/qa/`. The reviewer is the same independent QA agent. The author's claims in `PHASE_00.md` §12 were checked against the actual files and were not relied on.

### 7.1 Commands and their actual exit codes

| # | Command | Exit | Result |
|---|---|---|---|
| R-1 | Copied the snapshot to a scratch dir, ran `git init`, created a dummy `.env` (non-secret) | 0 | Scratch repo |
| R-2 | `node scripts/verify-phase-00.mjs --scope` | **0** | `RESULT: PASS`. 15/15 docs; references VG 18, OLD 23, OWN 17, RG 15, PG 21, CMD 23, INV 23, T 30, P 56, C 10, F 19, SOD 5, all defined; banned term absent; no secret patterns; `.env` ignored; lock body identical to `rules.md`; only allowlisted files; no dependencies. This matches the owner-machine run recorded in PHASE_00 §6.1 |
| R-3 | `node scripts/verify-phase-00.mjs` | **0** | `RESULT: PASS` |
| R-4 | `cmp` of the snapshot's `docs/QA_PHASE_00.md` and `scripts/qa/*.sh` against the reviewer's originals | 0 | Byte-identical: the author did not alter the QA report or the evidence scripts |
| R-5 | `bash scripts/qa/verify-negative-tests.sh <snapshot> <scratch>` (the copy in the repo) | 0 (harness) | Both baselines exit 0 and all 14 cases print `OK`. **However, this harness has a reviewer-side defect** (QA00-R5): it wrote `out.txt` inside the seeded repo, which the new `--scope` allowlist flags in every case. "OK" from this version therefore does not prove that the seeded defect was detected |
| R-6 | `bash qa-evidence/verify-negative-tests.sh <snapshot> <scratch>` (corrected harness: output written outside the repo, and each case prints the actual FAIL lines) | 0 (harness) | Baselines 0/0. **All 14 cases exit 1, each for its own seeded defect**: N2–N4 "Supabase secret key in: deploy/run.sh / Dockerfile / data/keys.csv"; N5 banned term in `data/products.csv`; N6–N8, N13 "files outside the Phase 00 allowlist: lib/invoice.ts / db/0001_init.sql / pages/index.tsx / src/a.ts"; N9 "ARCHITECTURE_LOCK.md body differs from rules.md"; N1, N10–N12, N14 as in §1.3. **QA00-15 is resolved** |
| R-7 | 4 extra negative tests of the new detector (X1–X4) | — | X1 `.agents/x/invoice.ts` under `--scope` → exit **0** (not detected). X2 UTF-16LE file containing a fake secret → exit **0** (treated as binary). X3 secret in `scripts/qa/x.sh` → exit 1 (detected). X4 a header-only edit of `ARCHITECTURE_LOCK.md` → exit 1 (the drift check fails closed). See QA00-R-I1 |
| R-8 | `bash qa-evidence/db-design-probes-v2.sh <scratch>` (new throw-away PostgreSQL 16 cluster, synthetic rows, the role and privileges the remediated docs prescribe) | 0 (harness) | Results R1–R5 in §7.2 |
| R-9 | `grep` spot checks for Cypress mentions, remote handles, the gate enum, the RG-20 range, VG-17 in the runbook, P-07/P-81/P-91/P-98, SOD-1/3, encryption, OWN-16/17, the `.env.example` layout and `.gitignore` | — | See §7.3 |

As before, there is no formatter, lint, typecheck, build, unit, integration, authorization or Playwright tooling in Phase 00, and no results are claimed for any of them.

### 7.2 DB probes of the remediated design (R-8)

| Probe | Design element | Observed | Verdict |
|---|---|---|---|
| R1a | App role locks a `settlement_targets` row `FOR UPDATE` (DTB §4 level 7) | exit 0, row locked | ✔ |
| R1b | App role still cannot UPDATE an issued `tax_invoices` row | exit 1, `permission denied for table tax_invoices` | ✔ Immutability is kept |
| R2a | F-19: an allocation of 200.00 (A) and a credit of 50.00 (B) on the same 200.00 invoice, both locking its `settlement_targets` row | B waits for A, then sees outstanding 0.00 and is rejected with `CREDIT_EXCEEDS_OUTSTANDING` (no `excess_action`). Final outstanding 0.00 | ✔ |
| R2b | Control: the same two operations **without** the lock | Both commit and outstanding = **−50.00** | Confirms that the lock is what prevents the race |
| R3 | QA00-07: the balance row is created at 0.000 with the product, then two concurrent first receipts of 5.000 and 3.000 | Both exit 0, no errors, on_hand = 8.000 | ✔ The P4 `23505` failure no longer occurs |
| R4 | QA00-08: two invalidating postings into an ACCOUNTANT_REVIEWED period read the status unlocked, then take `FOR UPDATE` directly | Both exit 0, 0 deadlocks | ✔ The P5 deadlock no longer occurs |
| R5 | Level-4 rule "if OPEN take `FOR SHARE` and re-check": a transition to READY commits between the unlocked read and the grant of `FOR SHARE` | The unlocked read returns `OPEN`, but the re-check under `FOR SHARE` returns `READY_FOR_ACCOUNTANT_REVIEW` | Gap: the documents do not say what to do when the re-check fails. Upgrading would reintroduce P5 (QA00-R4) |

### 7.3 Per-finding status

| ID | Status | Evidence (re-review) |
|---|---|---|
| QA00-01 | **RESOLVED** | DTB §4 level 7 now locks `settlement_targets` rows and states that issued documents are never row-locked. CMD-04 step 6 locks the original invoice's row. CMD-11 step 3 and CMD-12/13 lock the same rows. CMD-02 step 12 inserts the invoice's row. DOMAIN_MODEL §3.9 defines the table, and DTB §7 lists it as a backstop. Probes R1a, R1b, R2a and R2b. |
| QA00-02 | **RESOLVED** | DOMAIN_MODEL `products` defines the derived `stock_tracking_status` (KNOWN if verified opening line, or created after the opening batch was POSTED, or approved OPENING_RESOLUTION). INV-08 was replaced with the agreed wording. CMD-02 step 5, CMD-08, SCOPE §4 and LEGACY §6 all use `stock_tracking_status = KNOWN`. `opening_stock_lines` notes that resolution makes the status KNOWN. This is consistent with PHASE_DEPENDENCIES §3 (products added after go-live). |
| QA00-03 | **RESOLVED** | PHASE_00 §6 row 10 and §6.1 record the final owner-machine run (exit 0, per-section summary). The reviewer reproduced exit 0 on the snapshot (R-2), with matching counts (OWN 17, F 19). The author's verdict line now reports the initial FAIL honestly. |
| QA00-04 | **RESOLVED** (with Minor residues QA00-R1, QA00-R2, QA00-R3) | DOMAIN_MODEL keys the liability on `(source_type ∈ {PAYMENT_OVERPAYMENT, CREDIT_AFTER_SETTLEMENT}, source_id)`. CMD-04 has a detailed boundary with `excess_action` and `CREDIT_EXCEEDS_OUTSTANDING`. FIN §5 matches. F-19 is added and proven by probe R2a. |
| QA00-05 | RESOLVED | The remaining Cypress mentions are historical records only (ADR alternatives and consequences, PHASE_00 §2/§4/§11, the OLD decision log, SCOPE C-02). `.gitignore` block removed. OWN-11 marked DECIDED / "Removed in Phase 00 addendum" |
| QA00-06 | RESOLVED | DTB §2 step 3 uses `SET LOCAL …` and says never session-level `SET` |
| QA00-07 | RESOLVED | DOMAIN_MODEL `stock_balances` and DTB §7; probe R3 |
| QA00-08 | RESOLVED (residue QA00-R4) | No SHARE→UPDATE upgrade (DTB §4 level 4, CMD-19; probe R4). CMD-02 step 7 `PERIOD_NOT_OPEN` exception. P-91 and the FIN §10 diagram allow READY only after month end |
| QA00-09 | RESOLVED | F-17 says transaction start. DOMAIN_MODEL principle 5 distinguishes issued documents from third-party documents |
| QA00-10 | RESOLVED | SOD-1, SOD-3 and DTB §7 say same-row CHECK or BEFORE INSERT trigger. `stock_movements` gains `source_type` and `movement_type`. INV-10 index on `movement_type = 'OPENING'` |
| QA00-11 | RESOLVED | One enum `NOT_STARTED, EVIDENCE_PENDING, APPROVED, FAILED, BLOCKED, REVOKED` in RELEASE_GATES line 3, DOMAIN_MODEL and FIN §15. RG-20 says "RG-00…RG-03 and RG-10…RG-19". RG-02 timing aligned (RELEASE_GATES §3 heading, PHASE_00 §7) |
| QA00-12 | RESOLVED (Info residue QA00-R-I2) | Runbook cites the full issuance set including VG-17. The mid-month sentence defers to OLD-19 |
| QA00-13 | RESOLVED | P-07, P-81 and P-98 rewritten as recommended. OWN-16 added |
| QA00-14 | RESOLVED | `.env.example` has no inline comments, and every assignment is bare (`SUPABASE_SECRET_KEY=` etc.) |
| QA00-15 | RESOLVED | Corrected harness R-6: 14/14 detected for the seeded defect (residual Info QA00-R-I1) |
| QA00-16 | RESOLVED | ADR-001 decision table has an "Encryption" row. T-14 requires provider confirmation in Phase 19 |
| QA00-17 | RESOLVED | No remote owner handles remain anywhere in the snapshot (`grep` exit 1) |
| QA00-18 | RESOLVED | DTB §4 level 8 and CMD-02 step 2: gates are read without row locks |
| QA00-19 | RESOLVED | OWN-17 added and referenced from DTB |
| QA00-20 | RESOLVED | PHASE_00 §13 lists the missing variable names, with no values |

### 7.4 New findings from the re-review

| ID | Severity | File (line) | Finding | Precise remedy |
|---|---|---|---|---|
| QA00-R1 | Minor | `DATABASE_TRANSACTION_BOUNDARIES.md` §5, CMD-11 row (line 69) | The command catalogue's backstop column still says "`customer_refund_liabilities.source_payment_id` U". That key no longer exists after QA00-04. | Replace with "`customer_refund_liabilities(source_type, source_id)` U (source_type = PAYMENT_OVERPAYMENT)". In the CMD-04 row, add "`customer_refund_liabilities(source_type, source_id)` U (CREDIT_AFTER_SETTLEMENT)". |
| QA00-R2 | Minor | DTB CMD-04 step 7–8 (line 115); CMD-11 step 8 (line 119) | (a) Step 7 says "If it would be < 0, require explicit `excess_action` … and create a … liability; **otherwise** reject `CREDIT_EXCEEDS_OUTSTANDING`". Read literally, "otherwise" rejects every credit that does **not** exceed outstanding. (b) A refund liability is a settlement target (DOMAIN_MODEL §3.9), but neither CMD-04 step 8 nor CMD-11 step 8 inserts its `settlement_targets` row. CMD-12 then has no row to lock. | (a) Replace with: "If it would be < 0: with `excess_action = CREATE_REFUND_LIABILITY`, create a `customer_refund_liabilities` row for the excess (`source_type = CREDIT_AFTER_SETTLEMENT`, `source_id` = this correction document); without it, reject `CREDIT_EXCEEDS_OUTSTANDING`. If ≥ 0, no liability is created." (b) Add to CMD-04 step 8 and CMD-11 step 8: "insert the liability's `settlement_targets` row in the same transaction". |
| QA00-R3 | Minor | `DOMAIN_MODEL.md` §3.9 derived outstanding (line 130); ER diagram (line 192) | The formula "gross + Σ debit − Σ credit − Σ allocations, never < 0" contradicts its own arithmetic. When a credit exceeds outstanding, the full credit is subtracted and the result is negative, even though a liability was recorded for the excess. The ER diagram only shows `PAYMENT ‖–o| CUSTOMER_REFUND_LIABILITY`. | Use "outstanding = gross + Σ issued debit deltas − Σ issued credit deltas − Σ allocations **+ Σ CREDIT_AFTER_SETTLEMENT liabilities sourced from credits on this invoice** (≥ 0 by construction)". Add the edge `CORRECTION_DOCUMENT \|\|--o\| CUSTOMER_REFUND_LIABILITY : "excess creates"`. |
| QA00-R4 | Minor | DTB §4 level 4 (line 45); CMD-19 bullet 2 (line 130) | "If OPEN take `FOR SHARE` and re-check" does not say what to do when the re-check fails. Probe R5 shows the re-check can return READY after the unlocked read returned OPEN. Taking `FOR UPDATE` at that point is exactly the SHARE→UPDATE upgrade that deadlocks (P5). | Add: "If the re-check under `FOR SHARE` no longer shows OPEN, ROLLBACK and restart the whole transaction with the same idempotency key (counts toward the bounded retry of §2.8); never upgrade the held lock." |
| QA00-R5 | Minor (QA artifact) | `scripts/qa/verify-negative-tests.sh` (run helper) | The reviewer's own harness wrote `out.txt` inside each seeded repo. Under the new `--scope` allowlist, that file fails every case, so "all 14 OK" could not prove detection. The author's PHASE_00 §12 claim ("each fails for its seeded defect") turns out to be true (R-6), but this version of the script cannot demonstrate it. | Replace `scripts/qa/verify-negative-tests.sh` with the corrected `qa-evidence/verify-negative-tests.sh` from this QA output. It writes output to `$d.out` outside the repo and prints the FAIL lines per case. Optionally also add `qa-evidence/db-design-probes-v2.sh` as `scripts/qa/db-design-probes-v2.sh`. |
| QA00-R-I1 | Info | `scripts/verify-phase-00.mjs` lines 44, 110 | (a) The `--scope` allowlist accepts any file under `.agents/` (X1 passes with `.agents/x/invoice.ts`). (b) NUL-byte binary detection skips UTF-16 text (X2). (c) The drift check slices a fixed 8-line header, so a legitimate header-only edit fails. It fails closed, which is acceptable. | (a) Narrow to `^\.agents\/skills\/[^/]+\/.*\.md$` (adjust to the actual tracked layout). (b) Optionally decode a UTF-16 BOM before deciding a file is binary. (c) Optionally compare from the first line after the `---` separator. |
| QA00-R-I2 | Info | `LEGACY_CUTOVER_PLAN.md` line 27 | The new OLD-19 sentence was added, but the old continuation remains, so the deferral appears twice: "…is OLD-19 and is not assumed here. AL STORE would then hold an **incomplete** book…; the legal handling is OLD-19…". | Delete "; the legal handling is OLD-19 and the release audit must show it explicitly" or merge the two sentences. |
| QA00-R-I3 | Info | `PHASE_00.md` §10 (line 136) | "Run the independent QA prompt … Do not start PROMPT 01 until it is PASS" is now stale. | Replace with "QA re-review PASS (QA_PHASE_00 §7); Minor items QA00-R1…R5 to be fixed in place; next: PROMPT 01." |

No new Critical or Major issue was found. The following were checked again and are still clean:
- No banned secondary-location name.
- No secrets.
- No legal figures.
- No application code or dependencies.
- The Albanian strings are unchanged and correct.
- The `ARCHITECTURE_LOCK.md` body is identical to `rules.md`.

### 7.5 Updated verdict and next-phase readiness

**Verdict: PASS** for the Phase 00 deliverables. All 4 Major findings and all 16 Minor and Info findings from the initial review are RESOLVED. The documents are sound enough to be the binding contract for later phases.

Remaining items, none of which block the next phase:
- **Fix in place without re-review:** QA00-R1 … QA00-R5, recorded in `PHASE_00.md` §12. They must be fixed before Phase 02 writes the schema, because QA00-R1 … R4 touch the transaction contract.
- **Optional:** QA00-R-I1 … R-I3 (Info).

**Next-phase readiness: READY for PROMPT 01**, under these conditions:
- **RG-02** (commit the spec and `rules.md`) is recommended before PROMPT 01 (RELEASE_GATES §3).
- **RG-00, RG-01 and RG-03** remain mandatory before Phase 02.
- All OLD-xx and VG-xx items remain open. They block the tax features and go-live, not Phase 01.

### 7.6 Files produced by this re-review (outside the repository; the snapshot was not edited)

- `docs/QA_PHASE_00.md`: this file, with the header verdict updated and this §7 added.
- `qa-evidence/verify-negative-tests.sh`: corrected harness (QA00-R5).
- `qa-evidence/db-design-probes-v2.sh`: probes R1–R5 of the remediated design. Synthetic data only; the banned name and fake token are assembled at runtime.
- `qa-evidence/db-design-probes.sh`: unchanged original (P1–P5).
