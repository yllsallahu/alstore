# PHASE 02 — Database, personal accounts, authorization and audit

| | |
|---|---|
| Date | 2026-10-13 |
| Executed by | Cursor agent, on the owner's computer (`alstore` working tree) |
| Spec | `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` — PROMPT 02 |
| Predecessor | Phase 01 — QA **WAIVED BY OWNER** (`docs/QA_PHASE_01.md`), not an independent PASS |
| Database used | Local PostgreSQL 17.11 cluster only (`scripts/db-local.sh`, `127.0.0.1:54329`). The Supabase project in `.env` is production (RG-03) and was never contacted. |
| Verdict (agent) | **PARTIAL PASS** — schema, RLS, roles, audit and idempotency done and tested; Supabase Auth wiring **BLOCKED** (§7). Awaiting independent QA. |

## 1. What this phase delivers

- **Schema** for every domain entity in `docs/DOMAIN_MODEL.md`: 58 tables in schema `app` (not exposed to the Supabase Data API), Drizzle ORM definitions in `src/server/db/schema/*`, generated migration `drizzle/0000_initial_schema.sql`.
  - Value types: `numeric(18,3)` quantities and unit prices, `numeric(18,2)` EUR amounts, `date` for local (Europe/Belgrade) document dates, `timestamptz` for instants, UUID v4 keys.
  - Status, enum, four-eyes and consistency rules as named CHECK constraints; partial unique indexes (one ACTIVE series per year and kind, one approved legal identity, one active cutover plan, one OPENING movement per product, …).
- **Security migration** `drizzle/0001_security_guards.sql` (hand-written):
  - Roles `alstore_app` (runtime), `alstore_readonly`, `alstore_migrator`, all NOLOGIN; credentials are provisioned per environment, never in migrations.
  - Least-privilege grants: no TRUNCATE or DDL for the app; no UPDATE on 18 append-only tables; DELETE only on draft line tables and link rows. PUBLIC and the Supabase API roles (if present) get nothing.
  - Row-level security on every table with policy `org_isolation` (`org_id = app.current_org_id()`, from `set_config('app.org_id', …, true)`).
  - Cross-organization foreign key guard: 52 generated `*_same_org` triggers, because PostgreSQL checks foreign keys without RLS.
  - Immutability: append-only triggers, status-frozen triggers, parent-frozen triggers for document lines, product SKU/unit guard, stock movement ↔ event/product guard, approvals guard (active actor with matching role; only APPROVED/REVIEWED → INVALIDATED), VAT rule overlap exclusion constraint.
  - `app.resolve_actor(uuid)`: SECURITY DEFINER lookup of a verified session user's organization, role and status (the only RLS bypass, single row).
- **Server code**:
  - `src/server/db/client.ts`: `createDb`, `runInTransaction` (READ COMMITTED; `SET LOCAL` org/actor context, `lock_timeout` 5 s, `statement_timeout`, `idle_in_transaction_session_timeout`; bounded jittered retry on SQLSTATE 40P01/40001/55P03).
  - `src/server/auth/permissions.ts`: the full P-01…P-102 matrix, `authorize` (role, then MFA for writes), `assertFourEyes`, `canApproveGate`, Albanian errors.
  - `src/server/auth/actor.ts`: `loadActor` (role and status from the database, never from JWT claims), `assertActorActive` (re-checked with a share lock inside every command).
  - `src/server/audit/audit.ts`: `writeAudit` with sanitized `safe_details` (credential and contact keys dropped; bounded size).
  - `src/server/idempotency/idempotency.ts`: claim/complete per DATABASE_TRANSACTION_BOUNDARIES §2.4; replay; 409 `IDEMPOTENCY_KEY_REUSED`. `src/server/lib/canonical-hash.ts`: canonical JSON + SHA-256 request hash.
  - Services: `bootstrapOrganization` (documented system operation, creates the first DIRECTOR), `inviteUser` / `setUserStatus` (P-01), `approveReleaseGate` / `revokeReleaseGate` (P-07).
- **Tests**: 45 new unit tests and 43 integration tests against the real local database (§6). A rollback method (§5).

No UI change: `/hyrje` still refuses every login (Phase 01 behaviour), because Supabase Auth is BLOCKED.

## 2. Decisions

| Decision | Reason |
|---|---|
| Local PostgreSQL only; Supabase Auth not wired | Owner decision (2026-10-13): the `.env` project is production (RG-03 BLOCKED). |
| `users.id` equals the Supabase `auth.users.id`, but no FK to `auth.users` yet | `auth` schema exists only on Supabase. Add the FK in the migration that first runs on a dev Supabase project. |
| Business tables in schema `app`, runtime role `alstore_app` without BYPASSRLS | ADR-001: the Data API never reaches business data; RLS is defense in depth behind server-side authorization. |
| Organization context via `set_config(..., true)` inside each transaction | Transaction-pooler safe; nothing leaks across pooled connections (tested). |
| `app.resolve_actor` SECURITY DEFINER | The org of a session user must be known before the RLS context can be set. Returns one row for a server-verified user id. |
| Generated same-org FK triggers instead of composite `(org_id, id)` FKs | Same guarantee without doubling every FK; covers all 52 single-column FKs between org-scoped tables, including future ones when the DO block is re-run. |
| One personal account per role, enforced in `inviteUser` | ROLE_PERMISSION_MATRIX §1 (one DIRECTOR, one ACCOUNTANT). |
| Director cannot disable their own account | Avoids lock-out without the Phase 19 break-glass procedure. |
| Joint gates: VG-06 and VG-11 need one live approval from each role, in any order | VAT_COMPLIANCE_GATES: VG-06 "Director + accountant"; VG-11 "Accountant (+ director to activate)". RG-xx and VG-18 → DIRECTOR; other VG → ACCOUNTANT. |
| P-51 for the ACCOUNTANT fails closed when the `invoice_issuers` setting is not supplied | OWN-04 is an owner setting; missing context must not grant issuance. |
| MFA is a field on the actor (`mfaVerified`) supplied by the session layer | Real AAL2 check needs Supabase Auth (BLOCKED). Every write path already requires it. |
| Five timestamp columns renamed during the phase (`occurred_at`, `verified_at`, `generated_at`, `recorded_at`, `rendered_at`) and over-long FK names shortened with the `fk()` helper | Found by tests; fixed before any database outside this machine existed, so `0000` was regenerated rather than patched. |

## 3. Files

### Created
- Schema: `src/server/db/schema/{_base,enums,auth-audit,settings,documents,parties,catalog-inventory,sales-invoicing,corrections,purchasing-imports,expenses,historical-migration,payments-debts,tax-reporting,index}.ts`.
- Server: `src/server/db/client.ts`, `src/server/auth/{permissions,actor}.ts`, `src/server/audit/audit.ts`, `src/server/idempotency/idempotency.ts`, `src/server/lib/canonical-hash.ts`, `src/server/errors.ts`, `src/server/services/{organization,users,release-gates}.ts`.
- Migrations: `drizzle/0000_initial_schema.sql`, `drizzle/0001_security_guards.sql`, `drizzle/meta/*` (generated), `drizzle/rollback/0000_0001_down.sql`.
- Config and scripts: `drizzle.config.ts`, `vitest.db.config.ts`, `scripts/db-local.sh`.
- Tests: `tests/unit/{permissions,audit-and-hash}.test.ts`, `tests/db/{config,global-setup,helpers}.ts`, `tests/db/{structure,isolation,immutability,services,rollback}.test.ts`.
- This file.

### Modified
- `package.json` / `package-lock.json`: `drizzle-orm` 0.45.4, `postgres` 3.4.9, `drizzle-kit` 0.31.11 (exact); scripts `test:db`, `db:local:{init,start,stop,status}`, `db:generate`, `db:migrate`.
- `.gitignore` (`/.local/`), `.prettierignore` (`drizzle/meta/`, `.local/`), `eslint.config.mjs` (`.local/**`).
- `docs/RELEASE_GATES.md` (RG-00/RG-01 APPROVED by owner confirmation, RG-02 EVIDENCE_PENDING, RG-03 BLOCKED), `docs/QA_PHASE_01.md` (owner waiver).

### Not changed
The spec, `rules.md`, Phase 00 architecture docs, `.env` (never opened).

## 4. Migrations

| File | Kind | Content |
|---|---|---|
| `drizzle/0000_initial_schema.sql` | Generated (`drizzle-kit generate`) | Schema `app`, 58 tables, constraints, indexes |
| `drizzle/0001_security_guards.sql` | Custom (`drizzle-kit generate --custom`) | Roles, functions, 98 triggers, exclusion constraint, grants, RLS |

Apply: `npm run db:migrate` (uses `DATABASE_MIGRATION_URL`, default is the local cluster). Tests recreate `alstore_test` from these files on every run.

## 5. Rollback method

- **Before any business data exists** (development, CI, a staging rebuild): run `drizzle/rollback/0000_0001_down.sql` as the migration owner. It drops schema `app` and the Drizzle journal, and drops the three roles if no other database on the server uses them. Then re-apply with `npm run db:migrate`. Tested end to end (up → down → up) by `tests/db/rollback.test.ts` on a scratch database.
- **After business data exists**: never roll back by dropping. Fix forward with a reviewed migration; restore from backup only under the Phase 19 recovery procedure.

## 6. Commands actually executed

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `npm install --save-exact drizzle-orm postgres` / `-D drizzle-kit` | 0 | Installed |
| 2 | `bash scripts/db-local.sh init` / `start` | 0 | Local cluster on 54329; `alstore_dev`, `alstore_test` created |
| 3 | `npx drizzle-kit generate --name=initial_schema`, `--custom --name=security_guards` | 0 | 58 tables |
| 4 | `npx drizzle-kit migrate` (local `alstore_dev`) | 0 | Applied; PostgreSQL NOTICE: 11 FK names truncated (> 63 bytes) |
| 5 | Named the 11 FKs with `fk()`, regenerated `0000`, recreated `alstore_dev`, migrated | 0 | No truncation |
| 6 | `npx vitest run` | 1 | 68/69: a unit test expected the wrong nesting depth; expectation corrected |
| 7 | `npm run test:db` | 1 | 3 files failed: Drizzle emits a schema-qualified `FOR SHARE OF`, which PostgreSQL rejects; switched to plain `FOR SHARE` / `FOR UPDATE` |
| 8 | `npm run test:db` | 1 | 41/42: `audit_events.occurred_at` was mapped to `created_at`; fixed it and 4 similar columns, regenerated `0000` |
| 9 | `npm run test:db` | 0 | 42/42 |
| 10 | Added same-org FK triggers and test; `npm run test:db` | 0 | 43/43 |
| 11 | Recreated `alstore_dev`, `npx drizzle-kit migrate`, trigger count | 0 | 98 triggers, 52 same-org triggers |
| 12 | `npm run format:check` | 1 | Only generated `drizzle/meta/*.json`; added to `.prettierignore` |
| 13 | `npm run format:check`, `lint`, `typecheck`, `npm test` | 0 each | 69 unit tests passed |
| 14 | `npm run build` | 0 | 15 routes, unchanged from Phase 01 |
| 15 | `npm run test:db` (final) | 0 | **5 files, 43 tests passed** |
| 16 | `node scripts/verify-phase-00.mjs` | 0 | `RESULT: PASS` |

Not re-run this phase: Playwright E2E (no UI change since Phase 01's 43 passing tests).

## 7. Test coverage

Unit (Vitest, 69 total, 45 new):
- Every DIRECTOR-only and ACCOUNTANT-only row is allowed for its role and denied for the other.
- P-102 is denied to both roles; every remaining row is allowed for both.
- The four-eyes set equals exactly the ✅¹ rows; same-user approval is denied for each.
- P-51 follows `invoice_issuers` and fails closed without it.
- MFA is required for writes and not for reads; the role check comes before MFA.
- Gate approvers per role, for every gate class.
- Canonical hash and audit sanitizing.

Integration (local PostgreSQL, the application connects as `alstore_app`, 43 tests):
- **Structure**:
  - 58 tables, RLS plus `org_isolation` on all of them.
  - The exact privilege set per table.
  - The read-only role has SELECT only; PUBLIC has nothing.
  - No runtime role is superuser or has BYPASSRLS.
- **Cross-company access**:
  - Only the current org's rows are visible, and nothing is visible without a context.
  - Writing, reading, updating or moving another org's row is denied.
  - Foreign keys into another org are denied, even for a privileged role.
  - The service layer returns NOT_FOUND for another org's user.
- **Append-only and immutability**:
  - The app role cannot UPDATE or DELETE audit events, and the triggers also block a privileged role.
  - Settlement targets can be locked but never changed.
  - Non-negative stock balance.
  - SKU and unit guard; movement/event/product consistency.
  - A confirmed sale and its lines are frozen, while draft lines stay editable.
  - VAT rule overlap is rejected, and an active rule can only be closed.
  - Approvals: four-eyes, role match, and only APPROVED → INVALIDATED.
- **Cross-role and denied actions (services)**:
  - The accountant cannot invite or disable users.
  - A missing MFA blocks writes.
  - One account per role; no self-disable.
  - A disabled user is locked out, including a stale in-memory actor.
  - RG-xx and VG-18 are DIRECTOR only; ordinary VG gates are ACCOUNTANT only.
  - A joint gate needs both roles, and revoking it invalidates the approvals.
- **Idempotency**:
  - Same key → replay, with no second approval or audit row.
  - Different payload or operation → 409.
  - A concurrent double submit → one write plus one replay.
  - Malformed keys are rejected.
  - A failed transaction leaves no key behind.
- **Transaction wrapper**: retries on 40P01 with the context still set; no retry on business errors; settings do not leak outside the transaction.
- **Rollback**: up → down → up on a scratch database.

## 8. Security notes and known limitations

- No secrets read or printed; `.env` was never opened. Tests use synthetic names only.
- The local cluster uses `trust` authentication on `127.0.0.1` only (development). `tests/db/config.ts` refuses any non-local host. The test setup enables LOGIN on the two runtime roles for the run and disables it again in teardown.
- Migrations run locally as the `postgres` superuser; `alstore_migrator` is created but not yet used. On Supabase, migrations run as the project owner and the app connects as `alstore_app` with a per-environment password (Phase 19 secret handling).
- Frozen-status triggers protect issued and posted documents. The workflow transitions themselves (who may move DRAFT → CONFIRMED and so on) are service rules delivered in each module's phase.
- `npm audit`: unchanged from Phase 01 (5 high, dev tooling only).

## 9. BLOCKED items (carry forward)

| Item | Needs |
|---|---|
| Supabase Auth: real login on `/hyrje`, session verification (`getUser`), MFA enrollment/AAL2, invite email, session revocation check | A **separate dev Supabase project** (RG-03) |
| FK `app.users.id → auth.users.id` | Same dev project |
| Applying migrations to any Supabase project | RG-03; production must not be touched |
| RG-02 (spec and `rules.md` committed) | Owner commit; the agent did not commit |

## 10. Verdict

Everything Phase 02 can deliver without Supabase is done and passes (format, lint, typecheck, 69 unit tests, 43 database integration tests, production build, `verify-phase-00.mjs`). Personal-account login and MFA are **BLOCKED** on RG-03. **PARTIAL PASS — awaiting independent QA.** Do not start PROMPT 03 until `docs/QA_PHASE_02.md` records a verdict and the owner decides how to handle the Auth blocker.
