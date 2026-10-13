# AL STORE V7 — Role & Permission Matrix

Status: Proposed (Phase 00). Implemented and tested server-side in Phase 02 onwards. Hiding a button is never an authorization control.

## 1. Roles

| Role | Holder | Summary |
|---|---|---|
| `DIRECTOR` | Owner (one personal account) | Broad operational access; **only role that may give final ATK period approval**; signs off opening stock and historical import batches (proposed). |
| `ACCOUNTANT` | Accountant (one personal account) | Broad operational access; approves tax configuration, invoice series and classifications; **records the accountant review** of a period; cannot give final period approval. |
| *(none)* | — | No anonymous, guest, customer, supplier, shared or service-user logins. Machine tasks (backups, reconciliation jobs) run with infrastructure credentials, never as an app user. |

Hard rules:
- A user has exactly one role (`user_roles.user_id` unique). The DIRECTOR cannot also hold ACCOUNTANT and vice versa.
- Roles are read from `app.user_roles` on the server for every request. `user_metadata` is never used for authorization; JWT claims are not trusted for role freshness on sensitive operations.
- MFA required for both accounts before any write permission is effective (rules.md §4).
- Every permitted write produces an `audit_events` row attributing actor and role.

## 2. Permission matrix

Legend: ✅ allowed · ❌ denied · ✅¹ allowed, but requires an approval by the *other* user before it takes effect · ⚙ subject to owner decision (default shown) · 👁 read only

| # | Capability | DIRECTOR | ACCOUNTANT | Notes |
|---|---|---|---|---|
| **Accounts & settings** |||||
| P-01 | Invite / disable users | ✅ | ❌ | First DIRECTOR is bootstrapped via a documented server-side procedure, not via UI signup. |
| P-02 | Change own password / MFA | ✅ | ✅ | |
| P-03 | Edit seller legal identity (OLD-01 fields) | ✅¹ | ✅¹ | Change effective only after the other user approves; locked once an invoice is issued under it (new version, never overwrite). |
| P-04 | Edit default payment term (15 days) | ✅¹ | ✅¹ | Spec: configurable with accountant review → accountant approval required. |
| P-05 | Configure cash-payment rule | ❌ | ✅¹ | Accountant proposes from verified law (OLD-10); DIRECTOR approval to activate. |
| P-06 | Toggle invoice issuers setting (OWN-04) | ✅ | ❌ | |
| P-07 | Approve / revoke release gate | ✅ for RG-xx, VG-06 (jointly with accountant), VG-11 activation, VG-18 · ❌ for other VG gates | ✅ for VG gates except VG-18 | Each gate names its approver in VAT_COMPLIANCE_GATES / RELEASE_GATES. |
| **Master data** |||||
| P-10 | Create/edit products (not SKU, not unit after movements) | ✅ | ✅ | SKU immutable; unit change only via audited approved migration. |
| P-11 | Create/edit customers & suppliers | ✅ | ✅ | |
| P-12 | Record customer verification (manual evidence) | ✅ | ✅ | No four-eyes in MVP; evidence file mandatory; which evidence suffices is decided under VG-07. |
| P-13 | Suspend customer verification | ✅ | ✅ | Takes effect immediately, including for open drafts. Lifting a suspension (reinstatement) uses the same permission and requires a fresh verification afterwards. |
| P-14 | Approve or reject a product unit migration (INV-05 exception) | ✅¹ | ✅¹ | Added in Phase 03. Requested under P-10 with a reason; approver ≠ requester (DB CHECK); applied only at zero on-hand stock, without converting any quantity. |
| P-15 | Define / retire identifier format and requirement rules for customer identifiers (OLD-14) | ❌ | ✅ | Added in Phase 03. Each rule records its source; without an ACTIVE rule no format validity is claimed. |
| P-16 | View products, customers, suppliers and their history | ✅ (👁) | ✅ (👁) | Added in Phase 03. |
| **Cutover & imports** |||||
| P-20 | Upload / dry-run product import | ✅ | ✅ | Includes changing the column mapping of an undecided batch. |
| P-21 | Approve product import batch | ✅ | ✅ | Requester ≠ approver not required (no stock/tax effect). |
| P-22 | Enter opening counts | ✅ | ✅ | Manual lines or an opening-count file (upload, dry run, approve into the DRAFT batch); mark counting complete; reopen before sign-off (invalidates a reconciliation). |
| P-23 | Mark opening stock RECONCILED | ❌ | ✅ | ⚙ OWN-05. Records a REVIEWED approval bound to the lines hash; a written reconciliation note against the Excel stock list of the final Excel workday is mandatory. |
| P-24 | Sign off and post opening stock | ✅ | ❌ | ⚙ OWN-05; requires P-23 first (different user and role; four-eyes recorded on the approval row). Locks the cutover plan. |
| P-25 | Enter last legacy invoice number / series proposal | ✅ | ✅ | Number entered only in secure settings, never in chat/prompts. |
| P-26 | Approve invoice series (incl. continuation from legacy number, annual reset) | ❌ | ✅ | VG-05. |
| P-27 | Upload / dry-run historical obligation batch | ✅ | ✅ | |
| P-28 | Validate historical batch | ❌ | ✅ | ⚙ OWN-06 |
| P-29 | Approve historical batch | ✅ | ❌ | ⚙ OWN-06; requires P-28. |
| P-30 | View historical import progress (restricted view) | ✅ | ✅ | Permission `historical_import.progress.view`; not on day-to-day screens. |
| P-31 | Create / edit the cutover plan draft (planned start date, final Excel workday) | ✅ | ✅ | Added in Phase 04. Editable only while DRAFT and before counting is complete; locked by the director's opening-stock sign-off (P-24). A start date that is not the first of a month needs an explicit acknowledgement (OLD-19). |
| **Inventory** |||||
| P-40 | View stock, ledger, balances | ✅ | ✅ | |
| P-41 | Request inventory adjustment | ✅ | ✅ | |
| P-42 | Approve inventory adjustment | ✅¹ | ✅¹ | Four-eyes: approver ≠ requester (DB CHECK). |
| P-43 | Run ledger↔balance reconciliation | ✅ | ✅ | Read-only. |
| P-44 | View import batches, opening-stock batches, the cutover plan and the invoice-series proposal | ✅ (👁) | ✅ (👁) | Added in Phase 04. |
| **Sales** |||||
| P-50 | Create / edit / discard sale draft | ✅ | ✅ | |
| P-51 | Issue invoice + confirm handover (CMD-02) | ✅ | ⚙ ✅ | Default both (C-08); owner may restrict to DIRECTOR. Blocked for everyone until tax gates pass. |
| P-52 | Download / print invoice PDF | ✅ | ✅ | Read-only; logged. |
| **Corrections** |||||
| P-60 | Draft correction document | ✅ | ✅ | |
| P-61 | Approve correction treatment (VAT, period) | ❌ | ✅ | VG-08. |
| P-62 | Issue approved correction document | ✅ | ✅ | Only after P-61. |
| P-63 | Request fulfillment (physical) correction | ✅ | ✅ | |
| P-64 | Approve fulfillment correction | ✅¹ | ✅¹ | Four-eyes. |
| **Purchasing & expenses** |||||
| P-70 | Register supplier invoice / import declaration / attachments | ✅ | ✅ | |
| P-71 | Post goods receipt (physical) | ✅ | ✅ | Discrepancy → hold. |
| P-72 | Release discrepancy hold | ✅¹ | ✅¹ | Four-eyes. |
| P-73 | Approve tax classification of purchase / import / expense | ❌ | ✅ | |
| P-74 | Record / post expense | ✅ | ✅ | |
| **Payments** |||||
| P-80 | Record bank payment / allocation | ✅ | ✅ | |
| P-81 | Record cash payment / allocation | ✅ | ✅ | Until VG-11 approved: a DIRECTOR-entered cash record is flagged for ACCOUNTANT confirmation; an ACCOUNTANT-entered record counts as accountant-confirmed (audited) unless the owner decides otherwise (C-09, OWN-16). |
| P-82 | Confirm overpayment → refund liability | ✅ | ✅ | Explicit confirmation step. |
| P-83 | Record refund | ✅ | ✅ | Cash refunds follow P-81 rule. |
| P-84 | Reverse a mistaken payment | ✅¹ | ✅¹ | Four-eyes. |
| **Tax periods & ATK** |||||
| P-90 | Approve VAT rules / rule sets | ❌ | ✅ | DIRECTOR 👁. |
| P-91 | Mark period READY_FOR_ACCOUNTANT_REVIEW | ✅ | ✅ | Only after the period's last calendar day (Europe/Belgrade), so issuance in the current month is never blocked. |
| P-92 | Flag issues, mark ACCOUNTANT_REVIEWED | ❌ | ✅ | |
| P-93 | Final approval DIRECTOR_APPROVED | ✅ | ❌ | Requires ACCOUNTANT_REVIEWED by a different user with matching snapshot hash. |
| P-94 | Generate internal preview ("JO PËR DORËZIM") | ✅ | ✅ | |
| P-95 | Generate OFFICIAL export | ✅ | ❌ | Only after DIRECTOR_APPROVED **and** VG-12 approved. |
| P-96 | Record manual EDI filing receipt | ✅ | ✅ | Evidence required. |
| P-97 | Close period | ✅ | ❌ | |
| P-98 | Open amendment on closed period | ✅ (approve only) | ✅ (request with reason only) | Accountant requests with reason; director approves. |
| **Audit & reports** |||||
| P-100 | View audit log | ✅ | ✅ | Nobody can edit or delete audit events. |
| P-101 | View/export reports | ✅ | ✅ | Exports labeled with filters, as-of time, scope metadata. |
| P-102 | Delete any issued/posted document | ❌ | ❌ | Not implemented for anyone. |

## 3. Separation-of-duties rules (enforced in DB and service)

| ID | Rule | Enforcement |
|---|---|---|
| SOD-1 | Period final approval needs a prior ACCOUNTANT_REVIEWED approval by an ACCOUNTANT user on the same snapshot hash | Service check + same-row CHECK (reviewer id copied onto the approval row) or BEFORE INSERT trigger + hash equality |
| SOD-2 | DIRECTOR cannot perform the accountant review, even though DIRECTOR has broad operational rights | Role check on P-92 |
| SOD-3 | Four-eyes approvals (✅¹): approver ≠ requester | Same-row CHECK on `approvals` (requester id copied onto the row) or BEFORE INSERT trigger, per kind |
| SOD-4 | Any change to period-relevant data after review invalidates review and approval | Snapshot hash recomputed on change; approvals set INVALIDATED (FINANCIAL_DOCUMENT_STATES §10) |
| SOD-5 | Tax configuration (rules, series, classifications) is approved by ACCOUNTANT only; DIRECTOR cannot self-approve tax treatment | Role check P-26, P-61, P-73, P-90 |

## 4. Two-person dependency risk

With exactly two users, four-eyes controls stop work if one person is unavailable. This is intentional for irreversible or tax-affecting actions. Day-to-day selling (P-51), receipts (P-71) and bank payments (P-80) require **one** person only. If either account is lost, recovery follows the break-glass procedure to be written in Phase 19 (no shared credentials, no permanent bypass).

## 5. Test obligations (Phase 02 onward)

For every row: an allowed-role test and a denied-role test at the server layer (route handler / server action), plus a cross-organization denial test. Four-eyes rows additionally test same-user approval denial. UI tests only confirm disabled/hidden states; they do not count as authorization tests.
