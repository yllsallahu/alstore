# AL STORE — instructions for Claude agents

Before any task in this repository:

1. Read `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` in full (governing V7 spec; V6 does not apply).
2. Read `docs/ARCHITECTURE_LOCK.md` (owner-locked stack, mirrors `rules.md`) and `docs/ADR_001_TECH_STACK.md`.
3. Read the Phase 00 architecture docs in `docs/` and every existing `docs/PHASE_XX.md` / `docs/QA_PHASE_XX.md`.
4. Inspect the repository for existing implementations before creating anything; never duplicate modules, tables, routes or migrations.

Non-negotiable:

- Implement **only** the numbered phase requested, then stop for independent QA. Do not start a phase whose predecessor lacks a PASS in `docs/QA_PHASE_XX.md`.
- Private Kosovo B2B wholesale only; one warehouse; units kg / m² / copë; 3-dp quantities and unit prices; 2-dp EUR; no negative stock; immutable issued documents; accountant reviews, director approves ATK periods.
- Never build: B2C/POS/fiscal receipts, a second warehouse or the banned legacy secondary location (spec A.2 — do not write its name anywhere), manufacturing/cutting, discounts module, returns module, email delivery of invoices, ATK login or automatic filing, AI accounting, profit/margin reports, offline queues.
- No legal guessing: tax rates, thresholds, invoice fields, templates and periods come only from `docs/OPEN_LEGAL_DECISIONS.md` items marked DECIDED with evidence. Gates in `docs/VAT_COMPLIANCE_GATES.md` fail closed.
- No secrets or real business data in code, tests, fixtures, logs, screenshots, prompts or commits. Synthetic data only.
- Never fabricate command output, test results or a PASS verdict. Record real commands and exit codes in `docs/PHASE_XX.md`.
- All user-facing text in Albanian (`sq-XK`); development docs in English.
- Run `node scripts/verify-phase-00.mjs` before reporting any phase; it checks required docs, ID cross-references, forbidden terms and secret patterns.
