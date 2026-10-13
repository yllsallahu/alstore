# AL STORE V7 — VAT & Tax Compliance Gates

Status: Proposed (Phase 00). **All gates are currently NOT_STARTED.** This document deliberately contains **no** Kosovo VAT rates, thresholds, invoice field lists, deadlines, template layouts or legal conclusions. Each of those is an open question in `OPEN_LEGAL_DECISIONS.md` that the accountant (and, where the accountant asks, legal counsel or ATK guidance) must answer with evidence.

## 1. How gates work

1. **Fail closed.** A feature guarded by a gate is unavailable until the gate is APPROVED. There is no default rate, default field set, or "temporary" behaviour that issues legal documents.
2. **Two keys for tax release.** Real invoice issuance requires (a) every gate in the issuance set APPROVED in the `release_gates` table (with evidence and approver recorded, audited) **and** (b) the production environment flag `ISSUANCE_ENABLED=true`. Either alone is insufficient. Revoking a gate takes effect on the next request.
3. **Evidence, not assertions.** Approval requires an attached evidence document (accountant memo, ATK guidance reference with retrieval date, official template file with hash) and the approver's identity. Development agents may never set a gate to APPROVED.
4. **Re-verification.** Each approval records a review date. Before production go-live (Phase 20) and on any law/template change, gates are re-confirmed. Spec F lists ATK reference pages that must be re-verified; they are references, not approvals.
5. **UI honesty.** While blocked, the UI states the reason in Albanian (e.g. "Lëshimi i faturave është i bllokuar deri në miratimin e kontabilistit") and never shows simulated success.

## 2. Gate register

| Gate | What must be confirmed | Approver | Evidence | Blocks | OLD ref | Status |
|---|---|---|---|---|---|---|
| VG-01 | Mandatory particulars and layout of a Kosovo B2B tax invoice for this business (seller and buyer fields, identifiers, required statements, unit labels incl. "copë", language, signature/stamp needs) | Accountant | Signed memo + approved PDF sample (synthetic data) | CMD-02, invoice template | OLD-01 | NOT_STARTED |
| VG-02 | VAT categories, rates and treatments applicable to the goods sold (aluminium, PVC, accessories, connectors), with effective dates | Accountant | Rule set approval + source reference | CMD-02, CMD-04 | OLD-02 | NOT_STARTED |
| VG-03 | Rounding policy (line vs document level, rounding mode) for 3-dp qty × 3-dp price → 2-dp EUR | Accountant | Approved test vectors | CMD-02, CMD-04, books | OLD-03 | NOT_STARTED |
| VG-04 | Tax point / document date and period-assignment rules (sales, purchases, imports, expenses, late documents) | Accountant | Memo | CMD-02, LB/LSH | OLD-04, OLD-12 | NOT_STARTED |
| VG-05 | Invoice numbering: series format, year-specific series, continuation from last legacy number, annual restart, separate correction series, gap policy | Accountant | Approved series records | CMD-02, CMD-04 | OLD-05 | NOT_STARTED |
| VG-06 | Seller legal identity data entered by owner in secure settings and checked against registration documents | Director + accountant | Registration evidence (private attachment) | CMD-02 | OWN-12 | NOT_STARTED |
| VG-07 | What constitutes acceptable verification of a registered business buyer (which identifiers, which source, re-verification interval) | Accountant | Procedure memo | CMD-02 | OLD-14 | NOT_STARTED |
| VG-08 | Credit / debit / correction document rules: types, fields, references, period treatment, paid/declared/closed-period cases | Accountant | Procedure memo + sample | CMD-04; also required for go-live | OLD-06 | NOT_STARTED |
| VG-09 | Purchase and import (Albania, DUD) VAT classification; which document is the LB source for which amount; customs amounts handling; no double counting | Accountant | Mapping memo + test vectors | Purchase/import classification approval, LB | OLD-07, OLD-08 | NOT_STARTED |
| VG-10 | Expense VAT classification per category | Accountant | Mapping memo | Expense classification approval, LB | OLD-09 | NOT_STARTED |
| VG-11 | Current legal B2B cash-payment rule and aggregation method | Accountant (+ director to activate) | Current legal source reference with retrieval date | Automatic cash enforcement (until then: per-record accountant confirmation) | OLD-10 | NOT_STARTED |
| VG-12 | Authentic current ATK LB/LSH templates, instructions and column mapping (`docs/ATK_TEMPLATE_PROVENANCE.md`, file hashes) | Accountant | Provenance doc + accountant-reviewed synthetic output | OFFICIAL export (Phase 15) | OLD-11 | NOT_STARTED |
| VG-13 | Period closing, late documents and amendment procedure | Accountant | Memo | Period CLOSED / amendments (Phase 16) | OLD-12 | NOT_STARTED |
| VG-14 | Whether any mandatory e-invoicing, fiscalization or electronic reporting obligation currently applies (or is scheduled) for B2B wholesale invoices | Accountant (legal counsel if needed) | Memo with sources | CMD-02 | OLD-17 | NOT_STARTED |
| VG-15 | Document retention period and acceptability of electronic storage (invoices, DUD, supplier invoices, count sheets) | Accountant | Memo | Production go-live (backup/retention design) | OLD-13 | NOT_STARTED |
| VG-16 | Accounting treatment of customer overpayment liabilities, refunds (incl. cash refunds) and supplier overpayments/credits | Accountant | Memo | Overpayment/refund paths of CMD-11/CMD-12 in production | OLD-15, OLD-16 | NOT_STARTED |
| VG-17 | Whether a separate delivery/transport document is legally required for goods handed over or transported | Accountant | Memo | CMD-02 (may require an additional document type → spec change) | OLD-21 | NOT_STARTED |
| VG-18 | Personal-data obligations for contact persons and stored documents | Owner + legal advisor | Memo | Production go-live | OLD-20 | NOT_STARTED |

## 3. Gate sets per capability

| Capability | Required APPROVED gates |
|---|---|
| Issue real B2B invoice (CMD-02) | VG-01, VG-02, VG-03, VG-04, VG-05, VG-06, VG-07, VG-08, VG-14, VG-17 |
| Issue correction document (CMD-04) | VG-01, VG-02, VG-03, VG-04, VG-05, VG-08 |
| Approve purchase / import tax classification | VG-04, VG-09 |
| Approve expense tax classification | VG-04, VG-10 |
| Automatic cash-rule enforcement | VG-11 |
| Overpayment → refund liability in production | VG-16 |
| Internal LB/LSH preview ("JO PËR DORËZIM") | none (always labeled; figures only from approved posted docs) |
| Accountant review / director approval of a period | VG-04, VG-09, VG-10 (otherwise LB is incomplete and the review must say so) |
| OFFICIAL ATK export | VG-12 + period DIRECTOR_APPROVED |
| Close period / amendment | VG-13 |
| Production go-live (any real data) | VG-15, VG-18 + RELEASE_GATES production set |

## 4. External approvals that block tax release

These cannot be produced by development work. Until each exists, real tax documents must not be issued and official exports must stay disabled:

1. **Accountant written sign-off** on VG-01 … VG-05, VG-07 … VG-17 (the accountant is the approver of record in the app; a licensed professional's sign-off is the owner's responsibility to obtain).
2. **Owner / director** provision and confirmation of the seller's legal identity and registration evidence (VG-06), entered in protected settings — never in source code, tests, prompts or chat.
3. **Owner-provided last used legacy invoice number and series** for the cutover year, confirmed by the accountant (VG-05).
4. **Authentic current ATK templates and instructions** retrieved from the official ATK website, with URL, retrieval timestamp and file hashes, reviewed by the accountant against synthetic output (VG-12).
5. **Legal confirmation on e-invoicing/fiscalization applicability** (VG-14) and personal-data obligations (VG-18) where the accountant cannot answer alone.
6. **Owner acceptance of the V7 specification** (RG-00) and owner authorization for operational use (RG-20).

## 5. Behaviour while gates are not approved

| Allowed | Blocked |
|---|---|
| Drafts, previews (no number, watermarked) | Assigning a legal invoice number |
| Synthetic-data invoices in staging only, watermarked as test | Any invoice in production |
| Recording purchase invoices, DUDs, expenses with tax classification `UNCLASSIFIED/PROPOSED` | Treating any input VAT as deductible |
| Internal book previews labeled "JO PËR DORËZIM" | Anything labeled or named as an official ATK/EDI file |
| Recording cash payments flagged for accountant confirmation | Automatic acceptance/rejection based on a guessed cash threshold |
| Showing the gate status to both users | Hiding a gate or showing a fake "compliant" badge |
