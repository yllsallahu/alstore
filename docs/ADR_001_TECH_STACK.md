# ADR-001 — Technology Stack

| | |
|---|---|
| Status | **Accepted — owner-locked** via `rules.md` (AL STORE V7 Master Architecture & Technology Lock). Changes require explicit owner approval and a superseding ADR. |
| Date | 2026-10-13 |
| Deciders | Owner (stack lock); recorded by Phase 00 |
| Related | `docs/ARCHITECTURE_LOCK.md`, `DATABASE_TRANSACTION_BOUNDARIES.md`, `THREAT_MODEL.md` |

## Context

V7 §B requires one Next.js + React + strict TypeScript application, PostgreSQL, **Prisma or Drizzle (choose one)**, Zod, deterministic decimal arithmetic, managed invitation-only auth, encrypted private document storage, backups with tested restore, and Playwright E2E. The owner's `rules.md` narrows these choices and adds hosting, PDF, XLSX, monitoring and CI decisions. Constraints: two users, ≈500 SKUs, low transaction volume, but strict transactional integrity, immutability and auditability; Albanian UI; online-only.

## Decision

| Concern | Choice | Notes |
|---|---|---|
| Architecture | **Modular monolith**: one Next.js app with server-only business modules | No microservices, no second backend |
| Frontend | Next.js App Router, React, TypeScript `strict`, Tailwind CSS, shadcn/ui + accessible primitives | Albanian (`sq-XK`) strings centralized |
| Server | Server Components, Route Handlers, server-only services on **Node.js runtime** (never Edge for DB writes) | Business logic never in React components |
| Validation | Zod (server-side authoritative) | Decimals as strings |
| Decimal math | Decimal.js | Never JS `number` for money/qty |
| Database | **Supabase PostgreSQL** (single authoritative DB) | `numeric` types, constraints, triggers, row locks |
| ORM / migrations | **Drizzle ORM + Drizzle Kit** | Resolves V7 "Prisma or Drizzle" → Drizzle. Prisma is excluded. |
| DB driver | `postgres` (postgres.js) via `drizzle-orm/postgres-js` — to be confirmed at Phase 02 install | If Supabase transaction pooler is used: `prepare: false`; no session advisory locks |
| Auth | Supabase Auth: invitation-only, public signup disabled, MFA required | Roles in `app.user_roles`, not `user_metadata` |
| Storage | Supabase Storage, private buckets, server-mediated access | Backups must include objects |
| PDF | React-PDF (`@react-pdf/renderer`), server-side render from snapshot | Template version recorded per render |
| XLSX/CSV | ExcelJS for controlled imports/exports | Limits + formula-injection escaping |
| Unit/integration tests | Vitest (+ real PostgreSQL for integration/concurrency tests) | No mocked DB for transaction tests |
| E2E | **Playwright** | Cypress removed 2026-10-13 (OWN-11) |
| Hosting | Render, Docker image, production-supported Node.js LTS | Separate staging and production services |
| CI/CD | GitHub (private) + GitHub Actions | Migrations reviewed and gated |
| Monitoring | Sentry with redaction | No PII/financial payloads |
| Encryption | TLS in transit; at-rest encryption of PostgreSQL, Storage objects and backups | Spec §B "encrypted private document storage": must be confirmed from provider documentation (URL + retrieval date) and recorded in Phase 19 — not assumed |

### Database layout decisions (detail in Phase 02)

- Business tables in a dedicated schema `app`, **not exposed** through the Supabase Data API; RLS enabled deny-by-default on every table as defense in depth (rules.md: RLS never replaces server authorization).
- Roles: `alstore_migrator` (DDL, CI only), `alstore_app` (DML on allowed tables, no DDL/TRUNCATE, no UPDATE/DELETE on append-only tables), optional `alstore_readonly` (renderers, reconciliation).
- Connection: Render runs a persistent Node.js server → prefer Supabase **session pooler or direct connection** with a small pool. Network compatibility (IPv4/IPv6) between Render and the chosen Supabase endpoint must be verified in Phase 02/19 — not assumed.
- Timestamps `timestamptz` (UTC); local document dates `date` in `Europe/Belgrade`.

### Version policy

Do not claim "latest". At Phase 01/02 install time, choose current **stable** releases that are mutually compatible, pin them in `package-lock.json`, and record exact versions with the commands executed in `docs/PHASE_01.md` / `PHASE_02.md`. No prerelease packages without owner approval. Local Node observed in Phase 00: `v22.23.2`, npm `10.9.8`; `.nvmrc` pins major 22 pending Phase 01 confirmation of the Render/Docker base image.

## Alternatives considered

| Alternative | Outcome |
|---|---|
| Prisma | Allowed by V7 but excluded by owner lock (rules.md §2). |
| Supabase Data API / client-side writes with RLS only | Rejected: financial state changes must be server-side transactions with locks and idempotency; RLS is defense in depth only. |
| PostgreSQL SEQUENCE for invoice numbers | Rejected: sequences are not gapless and not transactional; locked counter row instead. |
| SERIALIZABLE isolation everywhere | Rejected as default: explicit row locks under READ COMMITTED give deterministic, explainable behaviour; serializable may be used for specific reports. |
| Cypress for E2E | Rejected: spec and lock require Playwright. |
| Edge runtime | Rejected for DB-writing paths (Node.js runtime required for transactional drivers). |
| Offline-capable PWA | Rejected: A.15 online-only. |

## Consequences

- **Existing Cypress setup conflicted** (`package.json` devDependency, untracked `cypress/`, `cypress.config.js`). Removed on 2026-10-13 after owner approval (OWN-11): `npm uninstall cypress` (exit 0) and deletion of `cypress/` and `cypress.config.js`.
- Two runtimes of truth are avoided: everything business-relevant lives in Supabase PostgreSQL; Supabase Storage holds files referenced by hash.
- Supabase platform specifics (Data API exposure, `user_metadata` unsafety, token revocation lag, pooler modes) are handled explicitly (THREAT_MODEL T-03 … T-05).
- Render + Supabase means two vendors for backup/restore: the DR plan must cover PostgreSQL **and** storage objects and be tested (RG-19).
- All agents (Cursor, Claude) must read `docs/ARCHITECTURE_LOCK.md` before work; agent instruction files point there.
