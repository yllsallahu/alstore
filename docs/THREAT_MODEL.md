# AL STORE V7 — Threat Model

Status: Proposed (Phase 00). Method: asset/trust-boundary analysis with STRIDE categories (S spoofing, T tampering, R repudiation, I information disclosure, D denial of service, E elevation of privilege) plus business-integrity threats (BI). Mitigations are verified in the listed phase; Phase 19 re-tests all of them.

## 1. Assets

| Asset | Why it matters |
|---|---|
| Issued tax invoices, numbering, tax snapshots | Legal documents; errors/duplicates have tax consequences |
| Stock ledger | Physical truth; drives whether goods may be sold |
| Payments, allocations, refund liabilities | Money owed and received |
| LB/LSH snapshots, approvals, filing receipts | Monthly tax position and accountability |
| Business identifiers of seller, customers, suppliers; contact persons | Confidential commercial and personal data |
| Private documents (supplier invoices, DUDs, count sheets, verification evidence) | Confidential, legally retained |
| Supabase secret/service key, DB credentials, Sentry DSN, Render secrets | Full data access if leaked |
| User accounts (2) + MFA | All authority flows from them |
| Audit log | Non-repudiation |
| Backups | Contain everything above |

## 2. Actors

Legitimate: DIRECTOR, ACCOUNTANT, ops (infrastructure credentials), development agents (no production data access).
Adversarial: internet attacker; credential thief / phishing; malicious or compromised dependency; someone with a lost/stolen phone or laptop; a user making a mistake under time pressure; a user attempting to bypass separation of duties; a person with read access to the GitHub repo, CI logs or Sentry.

## 3. Trust boundaries

1. Browser ↔ Next.js server (HTTPS, session cookie). Browser is untrusted.
2. Next.js server ↔ Supabase PostgreSQL (server-only credentials, least-privilege app role).
3. Next.js server ↔ Supabase Storage (private bucket, server-mediated access).
4. Next.js server ↔ Supabase Auth (identity only; roles in app DB).
5. CI/CD (GitHub Actions) ↔ Render ↔ Supabase (deploy & migration credentials).
6. Uploaded files (CSV/XLSX/PDF/images) → parser (untrusted content).
7. Generated files (PDF/XLSX/CSV) → user devices and third parties (spreadsheet apps).
8. Development agents (Cursor/Claude) ↔ repository (no production secrets, no real data).

## 4. Threats and mitigations

| ID | Cat. | Threat | Mitigation | Phase |
|---|---|---|---|---|
| T-01 | I/E | Secret/service key shipped to browser (e.g. `NEXT_PUBLIC_` prefix, client import) | Only publishable key public; secret key in server-only module (`server-only` import guard); build-time check that client bundles contain no secret patterns; env validation | 01, 02, 19 |
| T-02 | I | `.env` or secrets committed / pasted into prompts, logs, screenshots | `.gitignore` covers `.env*` (verified never committed); `.env.example` only; secret scanning in CI; `scripts/verify-phase-00.mjs` pattern scan; rule: no secrets or real data in prompts | 00, 19 |
| T-03 | I | Business tables reachable through Supabase Data API with publishable key | Business tables in a non-exposed schema (`app`), Data API not used for business data, RLS enabled deny-by-default as defense in depth, explicit `REVOKE` from `anon`/`authenticated` | 02 |
| T-04 | E | Role spoofing via editable `user_metadata` or stale JWT claims | Roles only from `app.user_roles` read server-side per request | 02 |
| T-05 | S/E | Disabled user keeps a valid access token until expiry | Short JWT lifetime; server checks user status (and session validity) on every write and on sensitive reads; revoke sessions on disable | 02, 19 |
| T-06 | S | Credential theft / phishing | Invitation-only, MFA mandatory, no public signup, rate-limited login, login alerts in audit | 02, 19 |
| T-07 | E | Server action / route handler missing authorization (IDOR/BOLA) | Central `authorize(permission)` wrapper required by lint rule/test; per-permission allow+deny tests; org scoping in every query | 02+ |
| T-08 | E | Director bypasses accountant review / self-approval | SOD rules in DB (`approver_id <> reviewer_id`), role checks, hash-bound approvals | 16 |
| T-09 | T | Tampering with issued invoices, ledger, audit via SQL | Append-only triggers, revoked UPDATE/DELETE for app role, migrations under separate role, audit of admin access; periodic hash chain check of audit (optional) | 02, 05 |
| T-10 | BI | Double posting through retries, double clicks, two tabs, concurrent users | Idempotency keys + unique source keys + row locks (DATABASE_TRANSACTION_BOUNDARIES) | 05, 08, 10, 12 |
| T-11 | BI | Oversell / negative stock under concurrency | Ordered `FOR UPDATE` + `CHECK (on_hand >= 0)` | 05 |
| T-12 | BI | Invoice number collision / gap / manipulation | Locked series counter, U(series, number), server-side numbering only, approved legacy start | 08 |
| T-13 | T | Backdating or future-dating documents to move tax periods | `document_date` from server clock for issued invoices; purchase/expense dates validated against period status; closed periods immutable; audit | 08, 16 |
| T-14 | I | Private document leakage via guessable/public URLs or long-lived signed URLs | Private bucket; object keys random; access via authorized server route or ≤60 s signed URL; download audit; no public invoice URLs; TLS in transit and at-rest encryption of DB, storage and backups confirmed from provider documentation (URL + retrieval date) in Phase 19, not assumed | 02, 10, 19 |
| T-15 | T/D | Malicious upload (XLSX zip bomb, formula payloads, oversized files, polyglot PDF) | Size/row limits, MIME + magic-byte check, ExcelJS streaming with limits, no formula evaluation, quarantine status, files never served inline from the app origin as HTML | 04, 10, 13 |
| T-16 | T | CSV/XLSX formula injection in exports opened in spreadsheet apps | Escape cells beginning with `= + - @` and tab/CR in all exports | 14, 15, 17 |
| T-17 | T | XSS / injection in Albanian free text rendered in UI or PDF | React escaping, no `dangerouslySetInnerHTML`, React-PDF text nodes only, parameterized queries (Drizzle) | 01+ |
| T-18 | T | CSRF against state-changing endpoints | Same-site cookies, origin checks on route handlers, server actions' built-in protections verified, idempotency keys | 01, 19 |
| T-19 | I | PII/financial data in logs, Sentry, CI artifacts, screenshots | Structured logging with redaction allowlist; Sentry `beforeSend` scrubbing; synthetic data only in tests/screenshots | 01, 19 |
| T-20 | R | User denies having issued/approved | Personal accounts, MFA, append-only audit with actor, role, time, request id, hash | 02 |
| T-21 | D | Supabase / Render outage during sale | Online-only by design: user sees clear Albanian error; no local queue; retry with same key after recovery; paper fallback procedure documented in Phase 19 (no legal numbering outside the app) | 19 |
| T-22 | BI | Restore from backup loses invoices already handed to customers (numbers reused) | After any restore: issuance frozen; reconcile series counters against stored PDFs/customer copies and audit exports; set `next_number` by approved incident procedure; backups include storage objects | 19, 20 |
| T-23 | I | Repository is (or was) public; history exposes infrastructure identifiers | **Confirm both remotes are private (RG-01).** History contains a Supabase project ref (no secret) and a former public website; if the repo was ever public, treat anything in history as public and rotate any credential that was ever committed (none found in Phase 00 inspection) | 00 |
| T-24 | T | Supply-chain compromise of npm dependency | Lockfile pinned, `npm ci`, dependency audit in CI, minimal dependencies, no prerelease packages without approval | 01, 19 |
| T-25 | I | Development agent exfiltrates or is fed real business data | Agents work only with synthetic data; real data entered only in the running private app; no production credentials in dev `.env` | all |
| T-26 | BI | Wrong buyer type (consumer) receives an invoice | Only verified registered-business customers; no consumer fields or flows | 03, 08 |
| T-27 | BI | Legacy import double-counts debts or creates tax entries | Separate tables, U on original identity, no book/stock path, dry run + approvals | 13 |
| T-28 | BI | Official export generated from unverified template and filed | OFFICIAL export disabled until VG-12; preview watermark "JO PËR DORËZIM"; no ATK login | 15 |
| T-29 | D | Lost access to one of the two accounts blocks four-eyes actions | Documented break-glass account recovery via Supabase admin with owner + accountant presence and audit (Phase 19); no shared credentials | 19 |
| T-30 | I | Local `.env` points to a project holding real data on a developer machine | Dev/staging/prod separation; confirm the current `.env` project is non-production (OWN-08) | 00, 19 |

## 5. Phase 00 inspection results relevant to security

- `.env` exists locally with a Supabase **secret key**; it is ignored and absent from all git history (`git log --all -- .env` empty). Keep it that way; rotate if it was ever shared in chat/screenshots.
- `.cursor/mcp.json` was tracked until commit `6663846` and contained the Supabase project ref and MCP feature list (no token). Acceptable only if the repository is private.
- The repository previously hosted a public marketing site (`CNAME`, static HTML). Repository visibility must be confirmed private before any business code is pushed.
- No application code, migrations, or CI exist yet; no other secrets found in tracked files.

## 6. Residual risks accepted for MVP (owner to acknowledge)

- Two-person organization: four-eyes approvals can stall if one person is unavailable (T-29).
- Online-only: no issuance during outages (T-21) — chosen deliberately to avoid offline numbering conflicts.
- No authoritative business-registry integration: verification relies on documented manual evidence (VG-07).
