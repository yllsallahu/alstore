# AL STORE V7 — Inventory Invariants

Status: Proposed (Phase 00). Implemented in Phases 04–05 and re-verified in every later phase that touches stock. Each invariant names the layer(s) that enforce it and the test that proves it. "DB" means a constraint/trigger that holds even if service code is wrong.

## 1. Inventory model

- **One physical warehouse.** There is no location/warehouse column on stock tables; adding one requires a V7 spec change.
- Stock is tracked **per SKU in its canonical unit** (kg, m², copë). No conversion between units, no length/lot/batch dimension.
- The **ledger** (`stock_events` + `stock_movements`) is the only source of truth. `stock_balances` is a read model maintained in the same transaction and reconcilable from the ledger at any time.
- Quantities are `numeric(18,3)`; arithmetic in Decimal.js; never JS floats.
- No valuation, cost layers or margin in MVP (A.14). Prices never live on stock tables.

## 2. Allowed movement types (closed list)

| Movement type | Sign | Only source | Created by | Approval |
|---|---|---|---|---|
| `OPENING` | + (or 0 → no movement for VERIFIED_ZERO) | `opening_stock_lines` of the POSTED batch | CMD-14 | Accountant reconciliation + director sign-off (OWN-05) |
| `PURCHASE_RECEIPT` | + | POSTED `goods_receipt_lines` | CMD-08 | Discrepancy hold released by four-eyes |
| `SALE_FULFILLMENT` | − | `fulfillment_lines` of an issued sale | CMD-02 | Issuing user |
| `FULFILLMENT_CORRECTION` | ± | approved `fulfillment_correction_lines` | CMD-05 | Four-eyes |
| `ADJUSTMENT` | ± | approved `inventory_adjustments` (COUNT_CORRECTION, DAMAGE_LOSS, EXCEPTIONAL_RETURN, OPENING_RESOLUTION) | CMD-15 | Four-eyes |

Nothing else may create a movement. In particular these **never** change stock: sale drafts, invoice previews, issued invoice records themselves (only their fulfillment does), PDF generation/download/print, credit/debit/correction documents, purchase invoices, import declarations/DUD, expenses, payments, allocations, refunds, historical obligations, imports of products, LB/LSH projections, exports, reports, page refreshes.

## 3. Invariants

| ID | Invariant | Enforcement | Proof (test) |
|---|---|---|---|
| INV-01 | For every product, `stock_balances.on_hand = Σ stock_movements.quantity_delta` | Same-transaction update; reconciliation query; integrity block on mismatch | Property test: random sequences of postings then full reconcile (P05) |
| INV-02 | `on_hand ≥ 0` at every committed state (no negative stock) | Service check under `FOR UPDATE` + DB `CHECK (on_hand >= 0)` | Concurrent oversell test: N parallel sales > availability → only feasible subset commits (P05, P20) |
| INV-03 | Each source line posts at most once | DB `U(source_type, source_line_id)` on movements; `U(source_type, source_id)` on events | Duplicate submit / replay tests (P05, P08, P10) |
| INV-04 | Each sale has at most one fulfillment and it posts exactly one stock event | DB `U(fulfillments.sale_id)`, `U(stock_events(source_type, source_id))` | Issue-twice test (P08) |
| INV-05 | Movement unit equals product unit; a SKU's unit never changes after its first movement | DB CHECK via trigger; `products.unit` immutability trigger | Mismatched-unit insert rejected; unit edit rejected (P03, P05) |
| INV-06 | Ledger is append-only | Revoked UPDATE/DELETE + trigger | Direct UPDATE as app role fails (P02, P05) |
| INV-07 | Drafts never affect stock | No code path from draft save to ledger; balance unchanged assertion | Draft create/edit/discard → balance identical (P07) |
| INV-08 | A SKU whose `stock_tracking_status` is UNKNOWN (listed UNKNOWN or absent in the posted opening batch while it existed before cutover, and not yet resolved by an approved OPENING_RESOLUTION adjustment) cannot be sold or received. Products created after the opening batch is POSTED start KNOWN with on_hand 0.000. | Service check inside CMD-02/CMD-08 | UNKNOWN SKU issue/receipt rejected; SKU created after go-live can be received then sold (P04, P05) |
| INV-09 | VERIFIED_ZERO is distinct from UNKNOWN | Enum, not NULL semantics | Import test with 0 vs blank (P04) |
| INV-10 | Only one OPENING movement per product, ever | Partial unique index on `stock_movements(product_id) WHERE movement_type = 'OPENING'` | Second opening post rejected (P04) |
| INV-11 | No real sale before opening stock is POSTED and cutover EXECUTED | Gate check in CMD-02 | Issue before cutover rejected (P04/P08) |
| INV-12 | A financial correction (credit/debit) never creates stock | No ledger write path in CMD-04; DB role test | Credit note issue → balance unchanged (P09) |
| INV-13 | Physical delivery error is corrected only by FULFILLMENT_CORRECTION, never by a fictitious purchase or receipt | Only CMD-05 may post against a fulfillment; receipts require a supplier and are unrelated to fulfillments | 100 kg invoiced / 10 kg delivered scenario → +90.000 FULFILLMENT_CORRECTION, no receipt (P09, P20) |
| INV-14 | Cumulative fulfillment corrections cannot make delivered quantity < 0 or > what is supported by evidence | Service check under lock on fulfillment line | Over-correction rejected (P09) |
| INV-15 | Purchase invoice and payment never post stock; only POSTED goods receipts do | No ledger path in CMD-06/CMD-11 | Invoice + payment → balance unchanged; receipt → +qty once (P10, P12) |
| INV-16 | Goods already counted in the opening stock never post again when their late supplier invoice/receipt is registered | `covered_by_opening_count` flag; receipt dated ≤ last Excel day cannot post | Late-invoice-after-cutover test (P10, P20) |
| INV-17 | Expenses never create stock or fulfillment | No FK/path | Expense post → balance unchanged (P11) |
| INV-18 | Historical obligations never create stock | No FK/path | Historical import → balance unchanged (P13) |
| INV-19 | PDFs, exports, reports and previews are read-only | Read-only DB role for renderers; code review | Download PDF 10× → balance unchanged (P08, P20) |
| INV-20 | Adjustments require four-eyes approval and a reason; exceptional returns use adjustment kind EXCEPTIONAL_RETURN, not a returns module | Same-row CHECK (requester id copied onto the approval) or BEFORE INSERT trigger | Same-user approval rejected (P05) |
| INV-21 | Quantities have at most 3 decimal places and are > 0 on lines | Column scale + Zod + CHECK | 4-dp input rejected, not rounded (P03, P05) |
| INV-22 | Concurrent postings cannot deadlock indefinitely | Global lock order (products ascending) + lock_timeout + retry | Stress test with overlapping SKU sets (P05) |
| INV-23 | Stock history is explainable: every movement links to a human-readable source document and actor | FK to event → source; audit | Albanian stock history view shows source per row (P05) |

## 4. Reconciliation procedure

1. `SELECT product_id, SUM(quantity_delta)` from the ledger vs `stock_balances.on_hand`, plus event/line count checks.
2. Runs on demand (P-43), after every deploy/migration, after any restore, and on a schedule.
3. Any mismatch: create an integrity incident, set an integrity block on affected SKUs (CMD-02/CMD-08/CMD-05/CMD-15 reject them), alert both users. Resolution is an approved fix with audit evidence — never a silent `UPDATE stock_balances`.

## 5. Worked example (mirrors Phase 20 rehearsal)

| Step | Event | AL-01 on hand (kg) |
|---|---|---|
| 1 | OPENING verified 100.000 | 100.000 |
| 2 | Albania purchase invoice registered + DUD registered | 100.000 (no change) |
| 3 | Goods receipt POSTED 20.000 | 120.000 |
| 4 | Sale issued, fulfillment 15.000 | 105.000 |
| 5 | PDF downloaded 10× | 105.000 |
| 6 | Partial payment recorded | 105.000 |
| 7 | LSH projection generated | 105.000 |
| 8 | Credit note issued for price error | 105.000 |
| 9 | Separate scenario: invoiced 100.000 but handed over 10.000 → FULFILLMENT_CORRECTION +90.000 | +90.000 relative to the erroneous posting |
