# AL STORE V7 — Database Transaction Boundaries

Status: Proposed (Phase 00). Binding for Phases 02–16. Every command below is a **server-side** operation (Next.js route handler or server action on the Node.js runtime) using Drizzle against Supabase PostgreSQL. The browser never writes business tables directly; the Supabase Data API is not used for business data (ADR-001).

## 1. Definitions

- **Atomic** — all writes of the command commit together in one PostgreSQL transaction or none do. No external I/O (storage upload, PDF rendering, HTTP) inside the transaction.
- **Idempotent** — repeating the same request (same idempotency key and same payload hash) after any failure yields the same single effect and returns the same result.
- **Source-event key** — a natural unique key (e.g. `stock_events(source_type, source_id)`) that makes a second effect impossible even if idempotency handling had a bug. Idempotency keys are the first line; unique constraints are the backstop.

## 2. Global transaction protocol (all state-changing commands)

1. **Authenticate** the Supabase session server-side (verified JWT / `getUser`), require MFA level for writes, load role from `app.user_roles`, check the permission (ROLE_PERMISSION_MATRIX). For irreversible commands also confirm the session is still active (revocation check).
2. **Validate** input with Zod. Decimals arrive as strings and are parsed with Decimal.js; values with more than 3 dp (qty/price) or 2 dp (money) are rejected, never silently rounded.
3. `BEGIN` — isolation `READ COMMITTED` with explicit row locks (chosen over SERIALIZABLE for predictable behaviour and simpler retry semantics). Immediately after `BEGIN`: `SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '<n>s'; SET LOCAL idle_in_transaction_session_timeout = '<n>s'` (pooler-safe; never session-level `SET`).
4. **Claim the idempotency key** (irreversible commands): `INSERT INTO idempotency_keys (org_id, actor_id, key, operation, request_hash, status='IN_PROGRESS') ON CONFLICT DO NOTHING RETURNING id`.
   - Row returned → proceed.
   - No row → a committed record exists (a concurrent duplicate blocks on the unique index until the first transaction ends). `ROLLBACK`, read it: same `request_hash` and `COMPLETED` → return stored result (HTTP 200, flagged as replay); different hash → 409 `IDEMPOTENCY_KEY_REUSED`.
   - Because the key is inserted inside the business transaction, a rolled-back attempt leaves no key behind and can be retried safely.
5. **Acquire locks in the global order** (§4) and **re-validate every precondition inside the transaction** (state, version, verification, gates, stock, period status). Nothing checked before `BEGIN` is trusted.
6. Write business rows, ledger rows, read-model updates, approvals, one or more `audit_events`, then mark the idempotency key `COMPLETED` with `result_type/result_id`.
7. `COMMIT`. Post-commit side effects (PDF render, storage housekeeping) run afterwards and are themselves idempotent and non-posting.
8. **Retries:** SQLSTATE `40P01` (deadlock), `40001` (serialization), `55P03` (lock timeout) → bounded automatic retry (max 3, jittered) with the same key. Business-rule failures → rollback and a specific Albanian message; no retry.

Client contract: the client generates a UUID key when the user opens the final confirmation screen, bound to the draft version and payload. Editing the draft generates a new key. After a timeout or network drop the client first queries the document status endpoint, then (if not completed) retries with the **same** key. The submit control is disabled while a request is in flight; Enter never submits an irreversible action.

## 3. Idempotency key store

| Column | Purpose |
|---|---|
| `(org_id, actor_id, key)` unique | Scope: per user; a key cannot be replayed by another user |
| `operation` | e.g. `sale.issue`, `payment.record`; key reuse across operations → 409 |
| `request_hash` | SHA-256 of canonical payload; mismatch → 409 |
| `status` | IN_PROGRESS (only visible inside the open transaction) / COMPLETED |
| `result_type`, `result_id` | Pointer to the created document for replay responses |
| `created_at` | Retention: keep ≥ 90 days (purging never touches business data) |

## 4. Global lock order (deadlock avoidance)

Every command acquires locks in this order and skips levels it does not need:

1. `idempotency_keys` row (via insert)
2. Primary document header being transitioned (`sales`, `goods_receipts`, `correction_documents`, `fulfillment_corrections`, `import_batches`, `tax_periods` for period commands …) — `FOR UPDATE`
3. Party rows (`customers`/`suppliers`) — `FOR SHARE` (blocks a concurrent verification suspension until commit)
4. `tax_periods` row for the affected month — read status **without** a lock first; if OPEN take `FOR SHARE` and re-check; otherwise take `FOR UPDATE` directly (only for commands allowed to invalidate, CMD-19). Never upgrade SHARE → UPDATE (deadlock, QA probe P5). If the re-check under `FOR SHARE` no longer shows OPEN: `ROLLBACK` and restart the transaction with the same idempotency key (counts toward the bounded retry of §2.8); never upgrade the held lock.
5. `invoice_series` row — `FOR UPDATE`
6. `stock_balances` rows — `FOR UPDATE ORDER BY product_id`
7. `settlement_targets` rows of every allocation / correction target (issued invoices, issued debit documents, purchase invoices, expenses, historical obligations, refund liabilities) — `FOR UPDATE ORDER BY target_type, target_id`. Issued documents themselves are **never** row-locked: PostgreSQL requires UPDATE privilege for any row lock, and the app role has none on immutable tables.
8. `release_gates` / `org_settings` — read **without row locks**; a gate revocation applies to every transaction that starts after the revocation commits.

Session-level advisory locks are **not** used (incompatible with Supabase transaction pooling). Transaction-level row locks only.

## 5. Command catalogue

Legend: **A** atomic · **I** idempotency key required · **N** natural unique key(s) backing it.

| ID | Command | A | I | N (backstop) | Posts stock? | Tax-relevant? | Phase |
|---|---|---|---|---|---|---|---|
| CMD-01 | Save / edit / discard sale draft | ✓ | — (optimistic `version`) | — | No | No | 07 |
| CMD-02 | **Issue sale invoice with fulfillment** | ✓ | ✓ | `tax_invoices.sale_id` U; `(series_id, number)` U; `fulfillments.sale_id` U; `stock_events(source_type,source_id)` U; `stock_movements(source_type,source_line_id)` U | Yes (SALE_FULFILLMENT) | Yes | 08 |
| CMD-03 | Render / download invoice PDF | — | render: by `(invoice_id, template_version)` | — | **No** | No | 08 |
| CMD-04 | Issue correction document (credit/debit/correction) | ✓ | ✓ | `(series_id, number)` U; original invoice's `settlement_targets` row locked; `customer_refund_liabilities(source_type, source_id)` U (CREDIT_AFTER_SETTLEMENT) | **No** | Yes | 09 |
| CMD-05 | Approve & post fulfillment correction | ✓ | ✓ | `stock_events(FULFILLMENT_CORRECTION, id)` U | Yes | No | 09 |
| CMD-06 | Register purchase invoice | ✓ | ✓ | `(supplier_id, normalized_number)` U | **No** | Yes (after classification) | 10 |
| CMD-07 | Register import declaration (DUD) + links | ✓ | ✓ | `customs_reference` U | **No** | Yes | 10 |
| CMD-08 | Post goods receipt | ✓ | ✓ | `stock_events(PURCHASE_RECEIPT, receipt_id)` U | Yes | No | 10 |
| CMD-09 | Release discrepancy hold (four-eyes) | ✓ | ✓ | approval U per receipt | via CMD-08 | No | 10 |
| CMD-10 | Post expense | ✓ | ✓ | `(vendor, normalized_reference)` U + cross-module warning | **No** | Yes | 11 |
| CMD-11 | Record payment + allocations (+ refund liability) | ✓ | ✓ | `customer_refund_liabilities(source_type, source_id)` U (PAYMENT_OVERPAYMENT) | **No** | No | 12 |
| CMD-12 | Record refund | ✓ | ✓ | Σ refunds ≤ liability (locked check) | **No** | No | 12 |
| CMD-13 | Reverse payment (four-eyes) | ✓ | ✓ | `payment_reversals.payment_id` U | **No** | No | 12 |
| CMD-14 | Sign off & post opening stock | ✓ | ✓ | one OPENING movement per product (partial U index) | Yes (OPENING) | No | 04 |
| CMD-15 | Approve & post inventory adjustment (four-eyes) | ✓ | ✓ | `stock_events(ADJUSTMENT, id)` U | Yes | No | 05 |
| CMD-16 | Approve import batch (products / historical obligations) | ✓ | ✓ | batch file sha256 + U per obligation identity | No | **No** | 04, 13 |
| CMD-17 | Approve invoice series (incl. legacy last number) | ✓ | ✓ | `(fiscal_year, kind, code)` U | No | Yes (config) | 04/08 |
| CMD-18 | Approve / activate VAT rule set | ✓ | ✓ | no overlapping effective ranges per category (exclusion constraint) | No | Yes (config) | 06 |
| CMD-19 | Tax period transition (ready / review / approve / close / amend) | ✓ | ✓ | approval U per (period, kind, snapshot_hash) | No | Yes | 16 |
| CMD-20 | Generate export (preview / official) | ✓ (record) | by `(period_snapshot_hash, kind, template)` | — | **No** | Read-only | 14/15 |
| CMD-21 | Upload attachment & link | 2-step | by sha256 | `document_files.sha256` per org | No | No | 02+ |
| CMD-22 | Record manual EDI filing receipt | ✓ | ✓ | one per (period, filing kind) | No | No | 16 |
| CMD-23 | Verify / suspend customer | ✓ | — | — | No | No | 03 |

### CMD-02 Issue sale invoice with fulfillment — detailed boundary

Input: `sale_id`, `sale_version`, `idempotency_key`, `handover_acknowledged = true`, `displayed_totals` (what the user saw).

Inside one transaction, in order:

1. Claim idempotency key (§2.4).
2. Check gates (unlocked reads, §4 level 8): required tax gates APPROVED in `release_gates` **and** environment kill switch `ISSUANCE_ENABLED=true` **and** cutover status EXECUTED **and** no open integrity block. Any failure → `ISSUANCE_BLOCKED` with the gate list (Albanian message).
3. Lock `sales` row `FOR UPDATE`; require `status = DRAFT` and `version = sale_version`. If `CONFIRMED` → return "already issued" with a link to the existing invoice (not an error page).
4. Lock customer `FOR SHARE`; require a verification state permitted by VG-07; customer active.
5. Load lines; every product active, `stock_tracking_status = KNOWN` (INV-08), unit equals product unit, qty > 0 with ≤ 3 dp, price ≥ 0 with ≤ 3 dp. MVP: one line per SKU per sale (`U(sale_id, product_id)`, OWN-15).
6. `document_date := (now() AT TIME ZONE 'Europe/Belgrade')::date`; `fiscal_year` from it. Client dates are ignored.
7. Lock `tax_periods` row for the month per §4 level 4; must be OPEN. **Exception to CMD-19:** issuance never reopens a period — if it is not OPEN the command is rejected with `PERIOD_NOT_OPEN`. (P-91 prevents marking the current month ready before it ends.)
8. Lock the ACTIVE `invoice_series` for (`fiscal_year`, SALES_INVOICE) `FOR UPDATE`. None → `SERIES_NOT_APPROVED` (covers 1 January if the new-year series was not approved in time).
9. Lock `stock_balances` for all products `FOR UPDATE ORDER BY product_id`; require `on_hand − qty ≥ 0` for each. Failure → `INSUFFICIENT_STOCK` listing SKU, available, requested.
10. Compute tax from ACTIVE approved rules effective on `document_date` with Decimal.js and approved rounding policy; create immutable `tax_snapshots` row. Missing rule → `VAT_RULE_MISSING`. If server totals ≠ `displayed_totals` → `TOTALS_CHANGED` (user must re-review).
11. `number := series.next_number`; `UPDATE invoice_series SET next_number = next_number + 1` (gapless because a rollback also rolls the counter back). Never `MAX(number)+1`, never a PostgreSQL sequence.
12. Insert `tax_invoices` (+ lines with product/buyer/seller snapshots, due date = document_date + payment_term_days), `fulfillments` (+ lines), one `stock_events` row (type SALE_FULFILLMENT, source = fulfillment) with one `stock_movements` row per fulfillment line (negative delta), update `stock_balances`, insert the invoice's `settlement_targets` row, set sale `CONFIRMED`.
13. Audit events (`sale.confirmed`, `invoice.issued`, `fulfillment.posted`, `stock.posted`), idempotency key COMPLETED.
14. `COMMIT`. Then CMD-03 renders the PDF.

Interpretation recorded for QA: spec A.4 "exactly one stock-out movement" is implemented as **exactly one stock event per sale fulfillment**, containing exactly one movement line per SKU line. A second event for the same fulfillment is impossible by unique constraint. Owner acknowledgment of this interpretation: OWN-17.

### CMD-03 Render / download PDF

- Runs after commit, outside any business transaction; reads only the invoice snapshot and template version.
- Stores the file in the private bucket, records `invoice_pdf_renders` (sha256). Rendering twice with the same template version must produce the same visual content; a differing hash is logged for investigation.
- Download: authorization check → stream or ≤60-second signed URL → audit `invoice.downloaded`. If no render exists, render on demand.
- Never touches `sales`, `tax_invoices`, `stock_*`, `payment_*`. Enforced by code review, a DB role test (render worker has no write grant on those tables), and Phase 20 test "download 10× → stock unchanged".

### CMD-04 Issue correction document

1. Claim key. 2. Lock the correction document `FOR UPDATE` (status ACCOUNTANT_APPROVED). 3. Lock customer `FOR SHARE`. 4. Lock the target period per §4 level 4 (OPEN or the accountant-approved target period, OLD-12). 5. Lock the correction series `FOR UPDATE`. 6. Lock the **original invoice's `settlement_targets` row** `FOR UPDATE` — this serializes the correction against concurrent payment allocations (F-19). 7. Recompute outstanding of the original invoice **after** the credit. If it would be ≥ 0, no liability is created. If it would be < 0: when the payload carries explicit `excess_action = CREATE_REFUND_LIABILITY`, create a `customer_refund_liabilities` row (`source_type = CREDIT_AFTER_SETTLEMENT`) **and its `settlement_targets` row** for the excess; when it does not, reject with `CREDIT_EXCEEDS_OUTSTANDING`. Production use of this path stays behind VG-08 and VG-16 (OLD-06, OLD-15). 8. Allocate number, tax snapshot, insert document (+ a `settlement_targets` row if it is a debit document), audit; COMMIT. Never posts stock.

### CMD-11 Record payment + allocations

1. Claim key. 2. Lock party `FOR SHARE`. 3. Lock the targets' `settlement_targets` rows `FOR UPDATE` ordered (§4 level 7). 4. For each target compute outstanding from SoT (§3.9 of DOMAIN_MODEL). Historical obligation targets must be APPROVED. 5. Require each allocation ≤ outstanding and Σ allocations ≤ payment amount. 6. `excess = amount − Σ allocations`; if `excess > 0` and party is a customer, require explicit `overpayment_action = CREATE_REFUND_LIABILITY` in the payload, else reject `OVERPAYMENT_UNCONFIRMED`; never auto-apply to other invoices, never post as revenue. Supplier excess → blocked pending OLD-16. 7. Cash method: if VG-11 not APPROVED → record with `accountant_confirmation_required = true` (appears in accountant queue; no numeric limit guessed); if APPROVED → apply the approved rule and block if violated. A cash record entered by the ACCOUNTANT is treated as accountant-confirmed (audited) unless the owner decides otherwise (OWN-16). 8. Insert payment, allocations, liability **and the liability's `settlement_targets` row** (so CMD-12 can lock it), audit; COMMIT.
CMD-12 (refund) and CMD-13 (reversal) lock the same `settlement_targets` rows (liability / affected targets) before changing balances.
Bank reference duplicates (same party, reference, amount) → warning requiring explicit confirmation; idempotency covers technical retries.

### CMD-08 Post goods receipt

Lock receipt `FOR UPDATE` (status DRAFT, or DISCREPANCY_HOLD released by CMD-09); lock supplier; lock balances; every product must have `stock_tracking_status = KNOWN` (INV-08); if any line has `expected ≠ received` and hold not released → set DISCREPANCY_HOLD, post nothing. Else insert one `stock_events` (PURCHASE_RECEIPT) + lines (positive delta), update balances, POSTED. `covered_by_opening_count = true` receipts (goods counted in opening stock, invoice arrives later) post **no** stock and are recorded for linkage only.

### CMD-19 Period transitions and invalidation

- Transition commands lock the period `FOR UPDATE`, recompute the book projection, store a `tax_period_snapshots` row with content hash, and record the approval bound to that hash.
- Lock acquisition never upgrades: read status unlocked; if OPEN take `FOR SHARE` and re-check; otherwise take `FOR UPDATE` directly. If the re-check under `FOR SHARE` no longer shows OPEN, `ROLLBACK` and restart with the same key (bounded retry).
- A tax-relevant posting (other than CMD-02, which never reopens a period) dated in a period that is READY_FOR_ACCOUNTANT_REVIEW / ACCOUNTANT_REVIEWED / DIRECTOR_APPROVED requires explicit user confirmation, locks the period `FOR UPDATE`, sets it back to OPEN and marks prior approvals INVALIDATED — in the same transaction as the posting.
- A posting dated in a CLOSED period is rejected; it must go through an amendment (P-98) per OLD-12.

## 6. Critical failure handling

| # | Scenario | Mechanism | Expected result | Test (phase) |
|---|---|---|---|---|
| F-01 | Double click on "Lësho faturën" | Same key; second request blocks on key insert, then replays | One invoice, one event; second response = replay | 08 |
| F-02 | Timeout after server commit | Client queries status, then retries with same key | Existing invoice returned; no second number | 08 |
| F-03 | Two tabs, same draft | Sale row lock + `status`/`version` check | Second gets "already issued" + link | 07/08 |
| F-04 | Two users sell last 5 kg concurrently | Ordered `FOR UPDATE` on balances + `CHECK (on_hand >= 0)` | One succeeds; other `INSUFFICIENT_STOCK` | 05/08 |
| F-05 | Two issuances race for invoice number | Series row lock | Consecutive gapless numbers, no collision | 08 |
| F-06 | DB crash mid-transaction | PostgreSQL atomicity | Nothing persisted; retry safe | 05 |
| F-07 | PDF render fails | Render is post-commit and retryable | Invoice stays issued; "PDF po përgatitet" state; re-render | 08 |
| F-08 | Storage upload fails | Upload precedes DB link; DB only links verified objects | No dangling reference; user retries upload | 10/11 |
| F-09 | Verification suspended while draft open | Re-check under `FOR SHARE` lock at issue | Issue rejected | 07/08 |
| F-10 | Tax gate revoked mid-day | Gate read inside transaction | Next issuance blocked immediately | 06/08 |
| F-11 | 1 January, new series not yet approved | No ACTIVE series for year | `SERIES_NOT_APPROVED`; cutover runbook requires December approval | 08/20 |
| F-12 | Ledger ≠ balance detected | Reconciliation job sets integrity block per SKU | Postings for that SKU blocked until approved fix | 05 |
| F-13 | Concurrent double allocation to same invoice | Target row lock + outstanding recompute | Second allocation rejected or capped with explicit confirmation | 12 |
| F-14 | Payment against not-yet-imported historical invoice | Target must exist and be APPROVED | Rejected | 13 |
| F-15 | Session expires on final review screen | Re-auth; draft preserved; key preserved | No issuance until re-auth; then same key | 18 |
| F-16 | Deadlock / lock timeout under load | Global lock order + bounded retry | Success or clear "provoni përsëri" with same key | 05 |
| F-17 | Midnight boundary (23:59:59 vs 00:00:00 local) | `document_date` from the DB clock (`now()`, i.e. transaction start) in `Europe/Belgrade` | Deterministic date and period per transaction | 08/14 |
| F-18 | Restore from backup after incident | DR runbook (THREAT_MODEL T-22) | Issuance frozen until series reconciled with PDFs already delivered | 19 |
| F-19 | Credit note issued concurrently with a payment allocation on the same invoice | Both lock the invoice's `settlement_targets` row | Serialized; outstanding never < 0 without an explicitly recorded refund liability | 09/12 |

## 7. Database-level backstops (must exist even though services also check)

- `CHECK (on_hand >= 0)` on `stock_balances`; `CHECK (quantity > 0)` on sale/receipt/fulfillment lines; numeric scales fixed by column types.
- Append-only triggers + revoked `UPDATE/DELETE` on `stock_events`, `stock_movements`, `audit_events`, `tax_invoices(+lines)`, issued correction documents, `payments`, `tax_snapshots`, `tax_period_snapshots`.
- Trigger: `products.unit` immutable once a movement exists.
- Unique constraints listed in §5 column N.
- `CHECK` exactly one allocation target. Four-eyes and SOD rules (approver ≠ requester, director ≠ reviewer) are enforced by a **same-row** CHECK (the requester/reviewer id is copied onto the approval row) or a BEFORE INSERT constraint trigger — a plain CHECK cannot compare two rows.
- `stock_balances`: exactly one row per product, inserted at 0.000 in the transaction that creates the product; posting commands only lock existing rows (avoids the concurrent first-insert `23505`, QA probe P4).
- `settlement_targets(target_type, target_id)` PK: one mutable lock row per settlement target, inserted with the target; the only rows locked for allocation/correction concurrency.
- Exclusion constraint: no overlapping effective ranges for the same VAT category and scope.
- App database role has no `TRUNCATE`, no DDL; migrations run under a separate migrator role.
