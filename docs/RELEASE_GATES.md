# AL STORE V7 — Release Gates

Status: Proposed (Phase 00). Every gate below is **open**. RG-xx and VG-xx gate status values (one enum, also used by the `release_gates` table): `NOT_STARTED`, `EVIDENCE_PENDING`, `APPROVED`, `FAILED`, `BLOCKED`, `REVOKED`. PG-xx phase gates are QA verdicts (`PASS` / `FAIL` / `BLOCKED`) recorded in `docs/QA_PHASE_XX.md`, not database rows. Only humans with the listed authority set a gate to APPROVED; development agents record evidence and verdicts for their own phase only.

> **Hard rule (spec P20, §F):** if any mandatory gate is FAIL or BLOCKED, do **not** claim production readiness and do **not** issue real invoices. Nothing goes live automatically.

## 1. Gate families

| Family | Purpose | Where defined |
|---|---|---|
| RG-0x Project prerequisites | Safe to start building business code | §3 |
| PG-xx Phase QA gates | Each phase verified independently before the next starts | §2 |
| VG-xx Tax compliance gates | Legal/tax correctness before real tax documents | `VAT_COMPLIANCE_GATES.md` |
| RG-1x Production readiness | Security, operations, recovery | §4 |
| RG-20 Release decision | Owner + accountant authorization to go live | §5 |

## 2. Phase QA gates

For each phase NN: `docs/PHASE_NN.md` exists with commands and real exit codes, and `docs/QA_PHASE_NN.md` from an **independent** reviewer states **PASS**. FAIL/BLOCKED stops the sequence (spec §D).

| Gate | Phase | Minimum evidence beyond the general rule |
|---|---|---|
| PG-00 | Scope & architecture | All 13 required docs + ARCHITECTURE_LOCK + PHASE_00; `npm run verify:phase-00` exit 0; reviewer confirms no business modules or tax issuance were built |
| PG-01 | Bootstrap | Real screenshots 360/375/430/1440 px; lint, typecheck, build, Playwright exit codes |
| PG-02 | DB/auth/audit | Migrations + rollback method; allow/deny tests per permission; cross-org denial; append-only proofs |
| PG-03 | Master data | Unit immutability, SKU uniqueness, verification-state tests |
| PG-04 | Imports/opening | Dry-run, duplicate, rollback, idempotency tests; UNKNOWN ≠ ZERO |
| PG-05 | Stock engine | Concurrency oversell test, reconciliation, duplicate posting, failure-after-commit tests |
| PG-06 | VAT core | Approved synthetic test vectors; unapproved config blocks |
| PG-07 | Sale drafts | Drafts never touch stock; stale-stock and invalid-buyer tests |
| PG-08 | Issuance | Exactly-once under double submit/timeout/two users; gapless numbering; PDF 10× no effect |
| PG-09 | Corrections | Credit ≠ stock; 100→10 kg physical correction; paid/closed-period cases |
| PG-10 | Purchases | Invoice/payment no stock; receipt once; DUD separation; private file permissions |
| PG-11 | Expenses | No stock; duplicate reference; draft vs posted |
| PG-12 | Payments | 230/200 → 30 liability → refund; concurrent allocation; cash-rule behaviour |
| PG-13 | Historical | No stock/VAT/revenue/numbering; payment only after import; overlaps |
| PG-14 | Books | Source whitelist; date/timezone boundaries; historical excluded |
| PG-15 | ATK adapter | Disabled state proven; provenance doc if enabled |
| PG-16 | Periods | SOD; invalidation on change; closed-period lock |
| PG-17 | Reports | Numbers trace to sources; scope metadata on exports |
| PG-18 | UX/a11y | Viewports, keyboard, no Enter-issue, session expiry |
| PG-19 | Security/ops | Revoked users, escalation, URL leakage, failed deploy, **actual restore** |
| PG-20 | Release audit | `docs/RELEASE_AUDIT.md` itemized PASS/FAIL/BLOCKED |

## 3. Project prerequisites (RG-02 recommended before Phase 01; all required before Phase 02 writes any business schema)

| Gate | Requirement | Authority | Status |
|---|---|---|---|
| RG-00 | Owner formally accepts the V7 specification as replacing V6 for this implementation (spec header says it supersedes V6 "only after owner accepts this document") | Owner | APPROVED — owner confirmation in the agent session, 2026-10-13 |
| RG-01 | Both git remotes (`origin`, `upstream`) confirmed **private**; collaborator list reviewed; GitHub Pages disabled for this repo | Owner | APPROVED — owner confirmation in the agent session, 2026-10-13 (not independently verified by the agent) |
| RG-02 | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` and `rules.md` committed so the lock is versioned (both currently untracked) | Owner | EVIDENCE_PENDING — owner will commit personally (2026-10-13) |
| RG-03 | Supabase environments identified: which project the local `.env` points to (must be dev/staging), separate production project planned | Owner | BLOCKED — owner confirmed (2026-10-13) the local `.env` points to the **production** project. Phase 02 uses a local PostgreSQL cluster only and never connects to it; a separate dev Supabase project is required before Supabase Auth is wired (see `docs/PHASE_02.md`) |

## 4. Production readiness gates

| Gate | Requirement | Verified in | Status |
|---|---|---|---|
| RG-10 | PG-00 … PG-19 all PASS | QA docs | NOT_STARTED |
| RG-11 | Security test suite PASS (THREAT_MODEL mitigations re-tested) | P19 | NOT_STARTED |
| RG-12 | Staging deployed with separate DB/storage/secrets; full synthetic rehearsal passed | P19, P20 | NOT_STARTED |
| RG-13 | Monitoring/alerting with redaction verified (no PII in Sentry/logs) | P19 | NOT_STARTED |
| RG-14 | HTTPS on owner-provided domain (real DNS details only) | P19 | NOT_STARTED |
| RG-15 | Break-glass account recovery procedure documented and rehearsed | P19 | NOT_STARTED |
| RG-16 | Retention and personal-data obligations approved (VG-15, VG-18) | P19 | NOT_STARTED |
| RG-17 | Tax issuance gate set approved (VAT_COMPLIANCE_GATES §3 "Issue real B2B invoice") | Accountant/owner | NOT_STARTED |
| RG-18 | Cutover go/no-go checklist complete (LEGACY_CUTOVER_PLAN §11) | Owner | NOT_STARTED |
| RG-19 | Backup of PostgreSQL **and** storage objects, with an **executed and documented restore** into an isolated environment within the last 30 days, including post-restore invoice-series reconciliation drill | P19 | NOT_STARTED |

## 5. Release decision

| Gate | Requirement | Authority | Status |
|---|---|---|---|
| RG-20 | PG-20 PASS; RG-00…RG-03 and RG-10…RG-19 APPROVED; owner written authorization for operational use; accountant written sign-off on invoice fields, VAT classifications, credit/debit process, cash controls, import/DUD rules and (if official export is enabled) ATK template mapping | Owner + accountant | NOT_STARTED |

Partial release is allowed only in this form: current selling may go live with RG-20 approved even if **historical debt data** is not yet imported (A.11) and even if **official ATK export** remains disabled (VG-12) — in which case LB/LSH are prepared from the internal preview by the accountant outside the app, and the UI keeps "Eksporti ATK është në pritje të verifikimit".
