# AL STORE

Private, invitation-only B2B wholesale management application for a Kosovo VAT-registered business (aluminium, PVC, accessories, connectors; one warehouse). **This repository must remain private.**

## Status

**Phase 02 — database, authorization and audit** (`docs/PHASE_02.md`). Schema, row-level security, roles, audit and idempotency run against a local PostgreSQL cluster; real login (Supabase Auth) is blocked until a separate dev Supabase project exists. No feature of this repository may be used to issue real tax documents. See `docs/RELEASE_GATES.md`.

## Where to start

| Read | Why |
|---|---|
| `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` | Governing V7 specification and the numbered phase prompts |
| `docs/ARCHITECTURE_LOCK.md` | Owner-locked architecture and technology stack |
| `docs/SCOPE.md` | What is and is not being built; source of truth; user journeys |
| `docs/PHASE_00.md` | What Phase 00 produced and what blocks the next phases |
| `docs/OPEN_LEGAL_DECISIONS.md` | Questions the accountant/owner must answer before tax features go live |

## Phase workflow

One numbered prompt at a time → `docs/PHASE_XX.md` → independent QA (`docs/QA_PHASE_XX.md`) → next phase only on PASS.

## Checks

```bash
npm install
npm run dev               # http://localhost:3000 — shell visible only with APP_ENV=development and UI_PREVIEW=true
npm run check             # format:check, lint, typecheck, unit tests, build
npx playwright install chromium && npm run test:e2e
npm run db:local:init     # once: local PostgreSQL cluster in .local/ (needs Homebrew postgresql@17)
npm run db:local:start
npm run test:db           # recreates alstore_test from drizzle/ and runs the DB integration tests
npm run db:migrate        # applies drizzle/ to DATABASE_MIGRATION_URL (default: local alstore_dev)
npm run verify:docs       # required docs, ID cross-references, forbidden terms, secret patterns
```

## Secrets

Use `.env.example` as the template. Real `.env*` files are gitignored and must never be committed, pasted into prompts or shown in screenshots.
