# AL STORE V7 — Legacy Cutover Plan

Status: Proposed (Phase 00). Executable runbook is finalized in Phase 20 (`docs/RELEASE_AUDIT.md`). Development agents have **no access** to the legacy Excel workbooks (A.16); every legacy figure enters AL STORE only through the owner's verified uploads inside the private application or through the owner typing it into protected settings.

## 1. Principles

1. Before cutover, legacy Excel is the system of record. From the cutover instant, AL STORE is the system of record for **new** sales, purchases, receipts, expenses, payments, stock and tax books.
2. Legacy history is **not replayed**: no old sales, purchases or expenses are re-entered as live transactions. Only (a) a signed physical opening stock and (b) individual open historical invoices (receivables/payables) are brought in.
3. Imports never create stock movements other than OPENING, never create tax-book lines, never consume invoice numbers, never create revenue.
4. Go-live of current selling does **not** wait for historical debt migration (A.11). It waits for opening stock and tax gates.
5. No guessing: no inferred SKUs, tax IDs, quantities, dates or balances. Unknown stays UNKNOWN and blocks the affected operation.

## 2. Definitions

| Term | Definition |
|---|---|
| **Cutover date (D)** | First calendar day on which real AL STORE invoices may be issued. Preferred: **the first day of a month** (A.11). Chosen by owner (OWN-02), recorded in `cutover_plan`. |
| **Last Excel day (LED)** | D − 1. The final day on which legacy Excel issues invoices and records stock. |
| **Cutover instant** | D 00:00:00 in `Europe/Belgrade` (Kosovo local time), stored as UTC `timestamptz`. All OPENING movements carry this `effective_at`. |
| **Opening stock** | Physical count per SKU reconciled to end of LED, signed off, posted before the first real sale. |
| **Last used invoice number** | The highest invoice number (and series format) issued in the legacy process in the current calendar year up to LED; provided by the owner, confirmed by the accountant. |

## 3. Why first-of-month

- Monthly LB/LSH and VAT periods then contain only AL STORE documents (period M) or only legacy documents (period M−1). No mixed month.
- Opening stock is a clean month-start position.
- If the owner chooses a mid-month D, the period of D would contain both legacy and AL STORE documents; how that month's books and declaration must be prepared is OLD-19 and is not assumed here. AL STORE would then hold an **incomplete** book for that month, and the release audit must show it explicitly. This is supported only after the accountant approves the procedure.

## 4. Tax period boundary

| Period | Books prepared by | Notes |
|---|---|---|
| M−1 (and earlier) | Legacy process, outside AL STORE | Includes all invoices issued up to LED and supplier documents assigned to M−1 per accountant rules. |
| M (cutover month) and later | AL STORE | First `tax_periods` row. |
| Late legacy documents | Accountant decides (OLD-12) | A supplier invoice dated ≤ LED that arrives after D may belong to M−1's books (legacy) or be booked in M as a late document. AL STORE records it with `pre_cutover = true` and requires accountant period assignment; it never posts stock if the goods were in the opening count. |

## 5. Runbook timeline

| When | Step | Owner of step | Evidence / gate |
|---|---|---|---|
| T−60 → T−30 | All mandatory phase QA passed (RELEASE_GATES §2); all gates of the issuance set (VAT_COMPLIANCE_GATES §3: VG-01…VG-08, VG-14, VG-17) approved | Dev + accountant | QA_PHASE_XX docs, gate records |
| T−30 | Owner chooses D (first of month) and records it; accountant confirms period approach | Owner, accountant | `cutover_plan` LOCKED |
| T−30 | Seller legal identity entered in secure settings and approved (VG-06) | Owner + accountant | Approval record |
| T−21 | Prepared product list uploaded, dry run, errors fixed, approved | Owner | Import batch APPROVED |
| T−14 | Customers needed on day 1 created and verified per VG-07 | Owner/accountant | Verification evidence |
| T−7 | Staging rehearsal with synthetic data: opening → receipt → sale → PDF → payment → LSH preview | Dev | Phase 20 evidence |
| T−7 | Production backup + **tested restore** completed | Dev/ops | Restore log (RG-19) |
| LED (D−1) | Excel invoice issuance stops at end of business; owner records **last used invoice number and series**; physical count performed (no movements during count) | Owner | Count sheets (private attachments) |
| LED evening / D−1 | Count entered per SKU: VERIFIED_QTY / VERIFIED_ZERO / UNKNOWN; reconciled to Excel stock list; differences explained | Owner, accountant reconciles | Batch RECONCILED |
| LED | Invoice series for current year PROPOSED with `legacy_last_number`; accountant approves continuation or a new series (VG-05) | Accountant | Series ACCOUNTANT_APPROVED |
| D, before first sale | Director signs off opening stock → CMD-14 posts OPENING movements with `effective_at` = cutover instant | Director | Batch POSTED; reconciliation run = 0 differences |
| D morning | Go/no-go checklist (§11) | Owner | Signed checklist |
| D | Cutover EXECUTED; series ACTIVE; `ISSUANCE_ENABLED=true` in production | Owner/ops | Audit events |
| D | First real invoice; owner checks PDF, number continuity (`legacy_last_number + 1` or approved new start) | Owner | Screenshot (privacy-safe) |
| D … D+n | Historical receivables/payables imported in batches (§8) | Owner, accountant, director | Batch approvals |
| Dec (every year) | Approve next year's series before 1 January (VG-05) | Accountant | Series for Y+1 ACCOUNTANT_APPROVED |

## 6. Opening stock reconciliation rules

- Per SKU, canonical unit, 3 decimals. Weighed items recorded with the scale reading.
- `VERIFIED_ZERO` (counted, none present) ≠ `UNKNOWN` (not counted / not reconciled). UNKNOWN SKUs cannot be sold or received until resolved via an approved OPENING_RESOLUTION adjustment, which makes their `stock_tracking_status` KNOWN (INV-08). SKUs created after the opening batch is posted start KNOWN at 0.000.
- Aggregate legacy totals (e.g. "all AL", "all PVC") are never split into SKUs.
- Count sheets are stored as private attachments; the batch keeps the uploaded file hash.
- After POSTED, the opening batch is immutable; later discoveries are approved inventory adjustments with reason "gabim në numërimin fillestar" (wording reviewed in Phase 04).

## 7. Invoice numbering continuity

| Case | Behaviour |
|---|---|
| D within year Y, legacy already issued numbers in Y | Series for Y continues at `legacy_last_number + 1` **if** accountant approves continuation of the same series format (OLD-05). Otherwise an approved distinct series/prefix for Y prevents collision. |
| D = 1 January | New series for the new year as approved; `legacy_last_number` for the new year = none. |
| Year transition after go-live | On 1 January the system requires an ACTIVE series for the new year; issuance is blocked (`SERIES_NOT_APPROVED`) rather than guessing. Annual restart only if approved (A.11). |
| Collision protection | Uniqueness `(series_id, number)`; series code includes year; historical obligations carry their original series/number as references in a **different** table and never consume app numbers. Phase 13 tests overlap: a legacy reference "2026-0150" and an app invoice "2026-0150" can coexist only if they are legally distinct series — otherwise the import is rejected for review. |
| Gaps | Counter is gapless (row lock, rollback-safe). Whether any gap is legally tolerated (e.g. after a disaster restore) is OLD-05. |

## 8. Post-launch historical receivables and payables

1. Owner prepares a CSV/XLSX per direction (receivables / payables) with: party identifiers, original series + number, original issue date, original total (if verified), open balance at import, currency EUR, optional private attachment.
2. Upload inside the app → dry run: schema, party matching (exact identifier match; no fuzzy auto-match), duplicate detection (within file, against prior batches, against app-issued numbers), balance ≤ total, dates ≤ LED.
3. Row-level Albanian errors; the batch is all-or-nothing unless the accountant explicitly approves a reviewed subset.
4. Accountant validates → director approves (OWN-06) → obligations APPROVED.
5. Effects: appear in debts/aging and accept payments. No stock, no tax books, no revenue, no numbering, no VAT.
6. Rejected batches remain stored (audit) but have no effect.

## 9. Payments on legacy invoices before they are imported

Spec A.10: historical payments are **not processed** until the specific historical invoice is imported. Therefore:

- The app rejects any allocation to a non-existent or non-APPROVED historical obligation (F-14). There is no "unallocated customer cash" bucket for legacy debts in MVP.
- Interim procedure (OWN-09, to be confirmed by owner and accountant): such receipts/payments continue to be logged in the legacy record until the obligation is imported, then entered in AL STORE with the **actual** payment date and reference. Import order should prioritize parties who are actively paying.
- The open balance imported must be the balance **at LED**; payments after LED are entered as AL STORE payments (never pre-netted into the imported balance), so the trail stays complete.

## 10. "Recorded debts" reporting

| Surface | Behaviour |
|---|---|
| Day-to-day screens (Pagesat / Borxhet, customer/supplier pages, dashboard) | Heading **"Borxhet e regjistruara në AL STORE"**. No repetitive warning banner (A.10). Figures = app-issued invoices + approved historical obligations − allocations. |
| Restricted progress view (permission `historical_import.progress.view`) | Per direction: completeness status `NOT_STARTED / IN_PROGRESS / DECLARED_COMPLETE`; batches and their states; count and EUR sum of approved obligations; owner-declared **control totals** from the legacy source (count and sum entered by the owner, not derived); difference between declared and imported. |
| DECLARED_COMPLETE | Requires the owner-declared control totals to match imported totals (or documented explanation) and approval by both accountant and director. Until then the system must never present debt totals as the complete history. |
| Exports / printed statements / reports | Footer metadata: scope "regjistruar në AL STORE", as-of timestamp, and the historical-import status. This prevents a partial history being read as complete even though the screen shows no banner. |

## 11. Go / no-go checklist (cutover day)

- [ ] Opening batch POSTED; reconciliation ledger = balance; no UNKNOWN SKUs that the owner expects to sell on day 1
- [ ] Series for current year ACTIVE with approved start number
- [ ] All tax issuance gates APPROVED (VAT_COMPLIANCE_GATES §3)
- [ ] Seller identity and invoice template approved; staging synthetic invoice reviewed
- [ ] At least one verified customer exists
- [ ] Production backup taken after opening post; restore tested within the last 30 days
- [ ] Both users can log in with MFA; no other accounts exist
- [ ] Legacy Excel issuance stopped and the last used number recorded
- [ ] Owner authorization recorded

## 12. Rollback

| Situation | Action |
|---|---|
| Problem found **before the first real invoice** on D | Owner may abort: set `ISSUANCE_ENABLED=false`, keep using Excel, and restore the production DB to the pre-cutover snapshot (documented, audited). Opening batch is re-run on the new date. |
| Problem found **after** any real invoice was issued | No rollback (issued legal documents exist and customers hold them). Forward-fix only: corrections, adjustments, gate revocation to stop further issuance, incident report. |
| Historical batch wrong after approval | Not deletable. Approved correcting batch / reversal records (Phase 13 design), audited. |
