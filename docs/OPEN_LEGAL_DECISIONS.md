# AL STORE V7 — Open Legal & Business Decisions

Status: all OLD-xx **OPEN**; OWN-xx OPEN except OWN-11 (DECIDED) (Phase 00, 2026-10-13). This file lists questions, not answers. No development phase may encode an answer that is not recorded here as DECIDED with evidence. Development agents must not fill these in from memory, FAQs, forums or "typical" practice.

How to close an item: the decider records the answer, the source (document title, URL and retrieval date, or signed memo), the date, and attaches evidence privately in the app (not in git if it contains business identity). The linked gate then moves to EVIDENCE_PENDING → APPROVED.

Reference pages listed in spec §F, to be **re-verified by the accountant** (references only, not approvals): ATK LB/LSH templates `https://www.atk-ks.org/librat-e-blerjes-dhe-te-shitjes/`; ATK B2B tax invoice guidance `https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=135`; ATK credit/debit note FAQ `https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=175`; ATK import DUD FAQ `https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=171`.

## 1. Legal / tax decisions (accountant; legal counsel where noted)

| ID | Question | Why it matters to the build | Blocks | Decider | Status |
|---|---|---|---|---|---|
| OLD-01 | What particulars must a B2B tax invoice from this business contain (seller/buyer names, identifiers, addresses, invoice date vs delivery date, unit names incl. "copë", VAT breakdown, required statements, signature/stamp, language)? | Invoice schema, snapshot fields, PDF template | VG-01 → P08 issuance | Accountant | OPEN |
| OLD-02 | Which VAT categories/rates/treatments apply to aluminium profiles, PVC, accessories, connectors sold B2B; any exemptions; effective dates? | VAT rule data (entered by accountant, never seeded by developers) | VG-02 → P06/P08 | Accountant | OPEN |
| OLD-03 | Rounding: VAT per line or per document? Rounding mode (half-up / half-even)? How are 3-dp qty × 3-dp price products rounded to 2-dp EUR line and document totals? | Calculation engine and test vectors | VG-03 → P06 | Accountant | OPEN |
| OLD-04 | Tax point: which date determines the VAT period for sales (issue = handover here), domestic purchases, Albania imports (DUD date vs supplier invoice date), expenses? | `document_date`, period assignment | VG-04 → P06, P14 | Accountant | OPEN |
| OLD-05 | Numbering: required format; may the app continue the current-year legacy sequence from the last used number; is an annual restart required/allowed; separate series for credit/debit notes; are gaps ever tolerated (e.g. after disaster recovery); can an issued invoice ever be cancelled, and how? | `invoice_series` design, cutover, DR procedure | VG-05 → P04/P08 | Accountant | OPEN |
| OLD-06 | Credit/debit/correction documents: which types exist legally; mandatory fields and reference to original; buyer acknowledgment needs; which period they affect; time limits; handling for paid, declared, closed-period invoices | P09 state machine and LSH mapping | VG-08 → P09 | Accountant | OPEN |
| OLD-07 | Imports from Albania: which DUD/customs fields must be stored; is import VAT deductible and under which conditions; which document is the LB source for which amount; treatment of customs duty, broker fees, transport | P10 fields, LB mapping, no double counting | VG-09 → P10, P14 | Accountant | OPEN |
| OLD-08 | Does any accounting/legal requirement oblige AL STORE to compute inventory valuation or landed cost (spec excludes margin and keeps purchase price separate)? | Confirms no valuation module is needed | VG-09 | Accountant | OPEN |
| OLD-09 | Input VAT treatment for each expense category (rent, electricity, transport, services, other) and required documentation | P11 classification | VG-10 → P11 | Accountant | OPEN |
| OLD-10 | Current legal rule on B2B cash payments: threshold, whether it applies per transaction / per invoice / per day / per party, to receipts and payments and refunds; source and effective date | P12 cash control (no hard-coded value) | VG-11 → P12 | Accountant | OPEN |
| OLD-11 | Current official LB and LSH templates: file versions, columns, codes, identifier conventions, submission format, mapping from AL STORE fields | P15 adapter | VG-12 → P15 | Accountant (with authentic ATK files) | OPEN |
| OLD-12 | Late documents and amendments: where a document dated in a closed/filed period is reported; amendment procedure for filed months; must CLOSED require a filing receipt? | P14/P16 period rules, cutover late documents | VG-04, VG-13 → P16 | Accountant | OPEN |
| OLD-13 | Retention period and acceptable form (electronic) for issued invoices, supplier invoices, DUDs, count sheets, audit logs | Backup/retention design, deletion policy | VG-15 → P19 | Accountant | OPEN |
| OLD-14 | What is acceptable verification that a buyer is a registered business (which identifiers, which official source, frequency)? May the business invoice a registered business that is not VAT-registered, and does that change invoice fields? | Customer verification states, issuance gate | VG-07 → P03/P08 | Accountant | OPEN |
| OLD-15 | Accounting/tax treatment of a customer overpayment held as refundable liability; may refunds be paid in cash; may the customer authorize offset against a future invoice (spec: never automatic)? | P12 paths | VG-16 → P12 | Accountant | OPEN |
| OLD-16 | Supplier overpayments and supplier credit notes received: how recorded and how they affect LB | P10/P12 | VG-16, VG-09 | Accountant | OPEN |
| OLD-17 | Does any mandatory e-invoicing, fiscalization or electronic invoice reporting obligation apply now (or with a known start date) to B2B wholesale invoices of this business? | Could change issuance architecture | VG-14 → P08 | Accountant + legal counsel | OPEN |
| OLD-18 | Do imported historical receivables/payables (references only, no new posting) have any reporting implication; any requirement on how post-cutover payments of legacy invoices are recorded? | P13 design confirmation | P13 | Accountant | OPEN |
| OLD-19 | If cutover cannot be on the first of a month, how must the mixed month's LB/LSH be prepared? | Cutover fallback | Cutover (P20) | Accountant | OPEN |
| OLD-20 | Personal-data obligations (contact persons, stored documents, access logs, retention) under applicable Kosovo law | Data fields, retention, privacy controls | VG-18 → P19 | Owner + legal advisor | OPEN |
| OLD-21 | Is a separate delivery note / transport document legally required when goods are handed over or transported to the buyer? If yes, what fields? | May require an additional document type (spec change) | VG-17 → P08 | Accountant | OPEN |
| OLD-22 | Confirm all supplier invoices (Kosovo and Albania) are in EUR and no foreign-currency recording is required in MVP | Currency CHECK = EUR | P10 | Accountant | OPEN |
| OLD-23 | Correct instrument when an invoice states more quantity than was physically handed over (credit note vs other) and supporting documentation for the physical correction | P09 combined flow | VG-08 | Accountant | OPEN |

## 2. Owner (business) decisions

| ID | Question | Default proposed in Phase 00 | Blocks | Status |
|---|---|---|---|---|
| OWN-01 | Formally accept V7 as replacing V6 for this implementation | — | RG-00 | OPEN |
| OWN-02 | Cutover date D (first day of which month) | First of a month | Cutover | OPEN |
| OWN-03 | Last used invoice number and series in the cutover year (entered in protected settings, never in chat) | — | VG-05 | OPEN |
| OWN-04 | May the accountant issue sales invoices, or DIRECTOR only? | Both (setting can restrict) | P08 | OPEN |
| OWN-05 | Opening stock: who counts, who reconciles, who signs | Count: either; reconcile: accountant; sign: director | P04 | OPEN |
| OWN-06 | Historical import batches: validation and approval authority; who may see the restricted progress view | Accountant validates, director approves; both see progress | P13 | OPEN |
| OWN-07 | Confirm repository privacy and collaborator list (both remotes) | Private | RG-01 | OPEN |
| OWN-08 | Which Supabase project the local `.env` points to; create separate staging and production projects | Local = development/staging only | RG-03 | OPEN |
| OWN-09 | Interim handling of money received/paid for legacy invoices not yet imported | Logged in legacy record until imported, then entered with actual date | P13 | OPEN |
| OWN-10 | Low-stock thresholds per SKU for the dashboard | None until set | P17 | OPEN |
| OWN-11 | Remove Cypress in favour of locked Playwright | Removed in Phase 00 addendum (2026-10-13) | P01 | DECIDED |
| OWN-12 | Provide seller legal identity data and registration evidence (in-app, protected settings) | — | VG-06 | OPEN |
| OWN-13 | Production domain and DNS access | — | RG-14 | OPEN |
| OWN-14 | A company that is both customer and supplier: two linked records acceptable? | Yes | P03 | OPEN |
| OWN-15 | One line per SKU per sale (prices for the same SKU cannot differ within one sale) acceptable? | Yes | P07 | OPEN |
| OWN-16 | Before VG-11: does a cash record entered by the ACCOUNTANT count as accountant-confirmed, or must the DIRECTOR confirm it? | Counts as accountant-confirmed (audited) | P12 | OPEN |
| OWN-17 | Acknowledge that spec A.4 "exactly one stock-out movement" is implemented as exactly one stock event per sale with one line per SKU | Acknowledge | P05/P08 | OPEN |

## 3. Decision log

| Date | ID | Decision | Source / evidence | Decided by |
|---|---|---|---|---|
| 2026-10-13 | OWN-11 | Remove Cypress; Playwright is the only E2E tool | Owner instruction in chat ("remove cypres") | Owner |
