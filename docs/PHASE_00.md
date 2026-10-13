# PHASE 00 — Scope freeze, architecture, transactional and compliance blueprint

| | |
|---|---|
| Date | 2026-10-13 |
| Executed by | Claude (development agent), against the local repository `alstore` on the owner's computer |
| Spec | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` — PROMPT 00 |
| Stack lock | `rules.md` → `docs/ARCHITECTURE_LOCK.md` |
| Verdict | Initial QA: FAIL (4 Major). After remediation (§12) the independent re-review verdict is **PASS** (`docs/QA_PHASE_00.md` §7); re-review Minor items fixed in place (§14). | Project prerequisites RG-00 … RG-03 are **open** and block Phase 02 (see §7). |

## 1. What this phase delivers

Architecture **documentation** and a **minimal safe scaffold** only. No application code, no database schema or migrations, no business modules, no tax issuance, no UI. Nothing was committed or pushed to git; all changes are in the working tree for owner review.

## 2. Pre-work inspection (duplicate-work check)

| Finding | Consequence |
|---|---|
| No application code, migrations, CI or docs existed (former static website removed in commit `c3841d8`) | Nothing to reuse; no duplicate modules possible |
| `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md`, `rules.md`, `cypress/`, `cypress.config.js` are **untracked** | RG-02: owner should commit the spec and lock |
| `rules.md` locks the stack and requires `docs/ARCHITECTURE_LOCK.md` | Created (verbatim copy + header) |
| `package.json` had only a `cypress` devDependency | Conflicted with locked Playwright → C-02 / OWN-11; removed after delivery on owner instruction (§11) |
| `.agents/skills/supabase*` agent guidance present (tracked) | Kept; consistent with stack |
| `.env` holds Supabase URL, publishable key, secret key, JWKS URL; gitignored; `git log --all -- .env` empty (never committed) | RG-03 / OWN-08: confirm it is a non-production project |
| History: `.cursor/mcp.json` (Supabase project ref, no token) tracked until `6663846`; repo previously served a public site (`CNAME`) | RG-01 / T-23: confirm both remotes private |
| Remotes `origin` `<origin-owner>/alstore`, `upstream` `<upstream-owner>/alstore` | Visibility could not be verified from the agent environment (GitHub API returned 403 through the proxy) |
| Local toolchain: Node `v22.23.2`, npm `10.9.8`; `pnpm`, `psql`, `docker`, `gh` not on PATH | Docker needed by Phase 19 (Render image); `psql`/local Postgres needed for Phase 02+ integration tests |

## 3. Decisions made in this phase

- Drizzle ORM (not Prisma) per owner lock — ADR-001.
- Modular monolith; business tables in non-exposed `app` schema; RLS deny-by-default as defense in depth; least-privilege DB roles.
- READ COMMITTED + explicit ordered row locks; idempotency key inserted inside the business transaction; natural unique keys as backstop; gapless invoice counter row (no `MAX()+1`, no SEQUENCE).
- "Exactly one stock-out movement" interpreted as exactly one stock **event** per sale fulfillment with one line per SKU (DATABASE_TRANSACTION_BOUNDARIES CMD-02).
- Separate entities for sale, invoice, fulfillment, purchase invoice, goods receipt, import declaration (DUD), correction document, fulfillment correction, expense, payment, allocation, refund liability, refund, opening stock, historical obligation, VAT rules/snapshots, tax periods/books.
- Tax release uses two keys: approved DB gate records **and** an environment kill switch; all gates fail closed and are currently NOT_STARTED.
- Four-eyes for adjustments, fulfillment corrections, discrepancy release, payment reversal; SOD for period approval.
- Default: both roles may issue invoices (owner may restrict, OWN-04); cash payments flagged for accountant confirmation until VG-11.
- Spec conflicts C-01 … C-10 recorded in SCOPE §9.

## 4. Files

### Created
| File | Purpose |
|---|---|
| `docs/SCOPE.md` | Scope, exclusions, source of truth, journeys, failure summary, repo findings, conflicts |
| `docs/DOMAIN_MODEL.md` | Entities, separations, relationships |
| `docs/ROLE_PERMISSION_MATRIX.md` | Permissions P-xx, SOD rules |
| `docs/DATABASE_TRANSACTION_BOUNDARIES.md` | Protocol, lock order, commands CMD-xx, failure handling F-xx, DB backstops |
| `docs/INVENTORY_INVARIANTS.md` | INV-xx invariants with enforcement and tests |
| `docs/FINANCIAL_DOCUMENT_STATES.md` | State machines incl. accountant review → director approval |
| `docs/LEGACY_CUTOVER_PLAN.md` | Last-Excel-day cutover, first-of-month, numbering continuity, historical imports, recorded-debts reporting |
| `docs/VAT_COMPLIANCE_GATES.md` | VG-xx gates, gate sets, external approvals blocking tax release |
| `docs/THREAT_MODEL.md` | T-xx threats and mitigations |
| `docs/ADR_001_TECH_STACK.md` | Stack decision |
| `docs/PHASE_DEPENDENCIES.md` | Dependency graph and table |
| `docs/RELEASE_GATES.md` | RG/PG gates |
| `docs/OPEN_LEGAL_DECISIONS.md` | OLD-xx legal questions, OWN-xx owner decisions |
| `docs/ARCHITECTURE_LOCK.md` | Verbatim persisted copy of `rules.md` (required by rules.md §11) |
| `docs/PHASE_00.md` | This record |
| `scripts/verify-phase-00.mjs` | Dependency-free check: required docs, ID cross-references, banned terms and secret patterns in every non-binary git-visible file, `.env` hygiene, ARCHITECTURE_LOCK ↔ rules.md drift, `--scope` allowlist + no-dependency check |
| `README.md` | Repo entry point (private, status, workflow) |
| `CLAUDE.md`, `.cursor/rules/al-store-v7.mdc` | Agent instructions pointing to the lock (rules.md §11) |
| `.env.example` | Variable names only; kill switches default `false` |
| `.nvmrc` (`22`), `.editorconfig` | Toolchain hygiene |

### Modified
| File | Change |
|---|---|
| `package.json` | Added `"private": true` and scripts `verify:phase-00`, `verify:docs`; `cypress` devDependency removed (§11). |
| `package-lock.json` | Rewritten by `npm uninstall cypress` (§11); no packages remain. |
| `.gitignore` | Appended Next.js build, test output, Supabase CLI state, `/private/`, `/imports/`, `*.pem`, `*.key`; Cypress artifact block removed (QA00-05). |

### Deleted
`cypress/` (example specs) and `cypress.config.js` — owner instruction (§11).

### Not changed
`AL_STORE_V7_CURSOR_MASTER_PROMPTS.md`, `rules.md`, `.env`, `.agents/`.

## 5. Migrations

None (Phase 02).

## 6. Commands actually executed

| # | Where | Command (abridged) | Exit | Result |
|---|---|---|---|---|
| 1 | owner's computer | `ls -la; git status; git log --oneline -15; find . -type f` (excl. node_modules/.git) | 0 | Inventory in §2 |
| 2 | owner's computer | `git ls-files; cat .gitignore package.json cypress.config.js; sed 's/=.*/=<redacted>/' .env; git check-ignore -v .env; git log --all -- .env` | 0 | `.env` ignored, never committed; values not printed |
| 3 | owner's computer | `cat AL_STORE_V7_CURSOR_MASTER_PROMPTS.md`; `cat rules.md` (full) | 0 | Read in full |
| 4 | owner's computer | `git remote -v; git log --stat …; node -v; npm -v; which pnpm psql docker gh` | 1 | Exit 1 from `which` (none of those four tools on PATH); Node v22.23.2, npm 10.9.8 |
| 5 | owner's computer | `git show 6663846^:.cursor/mcp.json` (secrets redacted by filter); `git log --all -- '*.env*' '.cursor/*'` | 0 | Project ref only, no token; no env file in history |
| 6 | agent environment | `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/<owner>/alstore` (both remotes) | 0 | HTTP 403 from proxy → visibility **unverified** |
| 7 | owner's computer | build `docs/ARCHITECTURE_LOCK.md` from `rules.md`; `tail -n +9 … \| diff -q - rules.md` | 0 | Body verbatim |
| 8 | owner's computer | `npm run verify:phase-00` (first run) | 1 | Expected: PHASE_00.md not yet written; false positive on `RG-0x` wording → regex fixed |
| 9 | agent environment | Detector self-test in a throw-away git repo seeded with a banned term, a fake secret and `src/a.ts` | 1 | Expected FAIL: all three seeded problems detected |
| 10 | owner's computer | `npm run verify:phase-00` (final, after QA remediation) | 0 | RESULT: PASS — see §6.1 |

### 6.1 Final verification
Run on the owner's computer after all QA00 fixes (2026-10-13): `npm run verify:phase-00` → exit **0**, `RESULT: PASS`.
- 1: 15/15 required docs present.
- 2: every referenced ID defined (VG 18, OLD 23, OWN 17, RG 15, PG 21, CMD 23, INV 23, T 30, P 56, C 10, F 19, SOD 5).
- 3: banned secondary-location term absent outside the governing spec.
- 4: no secret patterns in any non-binary git-visible file.
- 5: `.env` gitignored; no env files visible to git except `.env.example`.
- 5b: `docs/ARCHITECTURE_LOCK.md` body identical to `rules.md`.
- 6: only Phase 00 allowlisted files; `package.json` declares no dependencies.

File integrity: MD5 of all 23 remediated files on the owner's computer matched the agent's copies after transfer.

No formatter, lint, typecheck, unit, integration, build or Playwright commands exist yet (Phase 01 creates them); none were run and none are claimed. Screenshots: not applicable (no UI).

## 7. Blockers and open items

| Item | Blocks |
|---|---|
| RG-00 Owner acceptance of V7 (spec header condition) | Phase 02 |
| RG-01 Confirm both remotes private; disable Pages | Phase 02 (pushing any business code) |
| RG-02 Commit spec + `rules.md` | Recommended before Phase 01; required before Phase 02 (RELEASE_GATES §3) |
| RG-03 / OWN-08 Identify Supabase project in local `.env` (must not be production) | Phase 02 |
| OLD-01 … OLD-23, VG-01 … VG-18 | Tax features (Phases 06–16) and go-live; not Phase 01 |

## 8. Remaining assumptions

- Kosovo local time is represented by IANA `Europe/Belgrade` (no separate Kosovo zone exists in the IANA database).
- Customer and supplier are separate records even for the same company (OWN-14).
- One line per SKU per sale (OWN-15).
- Proposed approval authorities (OWN-04 … OWN-06) are defaults awaiting owner confirmation.

## 9. Security risks noted

T-23 (repository visibility / history), T-30 (local `.env` project identity), T-01/T-02 (secret handling) are the live risks today. See THREAT_MODEL §5.

## 10. Next step

Independent QA re-review verdict: **PASS** (`docs/QA_PHASE_00.md` §7). Re-review Minor items QA00-R1 … R5 and Info items fixed in place (§14). PROMPT 01 may start; RG-02 recommended first; RG-00, RG-01, RG-03 required before Phase 02.

## 11. Addendum — owner-approved change after delivery (2026-10-13 02:38)

Owner instructed removal of Cypress (resolves OWN-11 / C-02).

| Command (owner's computer) | Exit | Result |
|---|---|---|
| `npm uninstall cypress` | 0 | 171 packages removed; `package.json` has no dependencies; lockfile has no Cypress entries |
| `rm -rf cypress cypress.config.js` | 0 | Untracked Cypress example specs and config removed |

Docs updated: OPEN_LEGAL_DECISIONS (OWN-11 DECIDED + decision log), SCOPE C-02, ADR-001 consequences.

## 12. QA remediation record (after `docs/QA_PHASE_00.md`, verdict FAIL)

| Finding | Fix applied | Files |
|---|---|---|
| QA00-01 (Major) | Added mutable `settlement_targets(target_type, target_id)` lock rows; §4 level 7 locks them, never the immutable documents; CMD-04 now has a detailed boundary that locks the original invoice's row; CMD-11/12/13 lock the same rows | DATABASE_TRANSACTION_BOUNDARIES, DOMAIN_MODEL §3.9 |
| QA00-02 (Major) | Derived `stock_tracking_status` (KNOWN/UNKNOWN); products created after the opening batch start KNOWN at 0.000; OPENING_RESOLUTION makes UNKNOWN KNOWN; INV-08, CMD-02, CMD-08, SCOPE §4, LEGACY §6 reworded | INVENTORY_INVARIANTS, DATABASE_TRANSACTION_BOUNDARIES, DOMAIN_MODEL, SCOPE, LEGACY_CUTOVER_PLAN |
| QA00-03 (Major) | Final `verify:phase-00` run recorded with real exit code (§6 row 10, §6.1) | PHASE_00 |
| QA00-04 (Major) | Refund liability keyed by `(source_type ∈ {PAYMENT_OVERPAYMENT, CREDIT_AFTER_SETTLEMENT}, source_id)`; CMD-04 requires `excess_action` or rejects `CREDIT_EXCEEDS_OUTSTANDING`; outstanding never < 0; F-19 added | DOMAIN_MODEL, DATABASE_TRANSACTION_BOUNDARIES, FINANCIAL_DOCUMENT_STATES |
| QA00-05 | Stale Cypress text updated everywhere; `.gitignore` Cypress block removed | SCOPE, PHASE_00, ADR-001, ARCHITECTURE_LOCK header, OPEN_LEGAL_DECISIONS, PHASE_DEPENDENCIES, .gitignore |
| QA00-06 | `SET LOCAL` per transaction (pooler-safe) | DATABASE_TRANSACTION_BOUNDARIES §2 |
| QA00-07 | One `stock_balances` row per product created with the product | DOMAIN_MODEL, DATABASE_TRANSACTION_BOUNDARIES §7 |
| QA00-08 | No SHARE→UPDATE upgrade; CMD-02 never reopens a period (`PERIOD_NOT_OPEN`); P-91 only after month end | DATABASE_TRANSACTION_BOUNDARIES, ROLE_PERMISSION_MATRIX, FINANCIAL_DOCUMENT_STATES |
| QA00-09 | F-17 = transaction-start clock; principle 5 distinguishes issued vs third-party document dates | DATABASE_TRANSACTION_BOUNDARIES, DOMAIN_MODEL |
| QA00-10 | Cross-row "CHECK" claims reworded (same-row CHECK or trigger); `source_type`/`movement_type` added to `stock_movements` | ROLE_PERMISSION_MATRIX, DATABASE_TRANSACTION_BOUNDARIES, INVENTORY_INVARIANTS, DOMAIN_MODEL |
| QA00-11 | One gate status enum everywhere; RG-20 range "RG-00…RG-03 and RG-10…RG-19"; RG-02 timing aligned | RELEASE_GATES, DOMAIN_MODEL, FINANCIAL_DOCUMENT_STATES, PHASE_00 |
| QA00-12 | Runbook cites full issuance set incl. VG-17; mid-month sentence now defers to OLD-19 | LEGACY_CUTOVER_PLAN |
| QA00-13 | P-98, P-81, P-07 role cells rewritten; OWN-16 added | ROLE_PERMISSION_MATRIX, OPEN_LEGAL_DECISIONS |
| QA00-14 | `.env.example` comments moved to their own lines | .env.example |
| QA00-15 | Verify script scans all non-binary files, `--scope` is an allowlist + no-dependency check, lock-drift check added. QA harness `verify-negative-tests.sh` re-run in the agent environment: baselines exit 0, all 14 cases `OK` (each fails for its seeded defect) | scripts/verify-phase-00.mjs |
| QA00-16 | Encryption in transit/at rest to be confirmed from provider docs in Phase 19 | ADR-001, THREAT_MODEL T-14 |
| QA00-17 | Remote owner handles replaced by placeholders | SCOPE, PHASE_00 |
| QA00-18 | Gate rows read without locks; revocation applies to later transactions | DATABASE_TRANSACTION_BOUNDARIES |
| QA00-19 | OWN-17 asks the owner to acknowledge the one-event-per-sale interpretation | OPEN_LEGAL_DECISIONS, DATABASE_TRANSACTION_BOUNDARIES |
| QA00-20 | §13 below | PHASE_00 |

## 13. Environment still missing (names only, no values)

Local `.env` currently lacks: `APP_ENV`, `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `ISSUANCE_ENABLED`, `OFFICIAL_ATK_EXPORT_ENABLED`, `SENTRY_DSN`. Not yet in place: separate staging and production Supabase projects (RG-03), Supabase Auth with public signup disabled and MFA enforced (Phase 02), Render services (Phase 19).

## 14. Re-review follow-ups (fixed in place, no further review required per QA)

| Item | Fix |
|---|---|
| QA00-R1 | CMD-11 / CMD-04 backstop columns now cite `customer_refund_liabilities(source_type, source_id)` U |
| QA00-R2 | CMD-04 step 7 reworded (≥ 0 → no liability; < 0 → liability only with `excess_action`, else reject); CMD-04 and CMD-11 insert the liability's `settlement_targets` row |
| QA00-R3 | Outstanding formula adds CREDIT_AFTER_SETTLEMENT liabilities; ER diagram edge correction document → refund liability |
| QA00-R4 | Failed re-check under `FOR SHARE` → ROLLBACK and restart with same key; never upgrade |
| QA00-R5 | `scripts/qa/verify-negative-tests.sh` replaced by the reviewer's corrected harness; `scripts/qa/db-design-probes-v2.sh` added |
| QA00-R-I1 | `.agents/` allowlist narrowed to `.agents/skills/**/*.md`; UTF-16 files (BOM) decoded and scanned instead of skipped |
| QA00-R-I2 | Duplicate OLD-19 sentence merged |
| QA00-R-I3 | §10 updated |

