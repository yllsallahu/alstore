# AL STORE WEB — V7 CURSOR MASTER SPECIFICATION & EXECUTION PROMPTS

**Status:** Proposed implementation specification based on owner interviews, 13 October 2026. Not a claim of legal approval or working software.  
**Source baseline:** AL STORE V6 master prompts. V7 adopts the decisions below and supersedes V6 *for development only after owner accepts this document*.  
**Instructions to development AI:** English. **All end-user interfaces, invoices, forms, validation, exported documents and user notifications:** Albanian (`sq-XK`, correct ë/ç).  
**Execution:** Send **ONE numbered prompt at a time** to Cursor Agent, followed by the independent QA prompt. Do not paste all prompts into a single Agent task.

## A. Locked business decisions — must never be silently changed

1. A **PRIVATE WEB** application for a Kosovo VAT-registered wholesale business, **B2B ONLY**: goods sold exclusively to verified registered businesses. No B2C, POS, fiscal receipt, consumer checkout, fiscal-device integration or misleading claims of retail compliance.
2. **ONE physical stock / warehouse** only. No `DEPO BABI` anywhere in schema, UI, imports or documentation. No manufacturing, cutting, lot/batch/length variants or multi-warehouse processes in MVP.
3. Products: aluminium profiles, PVC, accessories, connectors, around **100–500 distinct SKUs**. Units allowed: **kg, m², copë**. Stock is per SKU and canonical unit; no silent conversion between units. Physical product quantities may require weighing. Preserve quantity precision to **3 decimal places**. Negotiated unit price **before VAT**, preserve **3 decimal places**; currency EUR, final financial amounts **2 decimal places** using approved, deterministic decimal rounding rules. No normal sales discount column or baseline list-price requirement; show the final negotiated unit price.
4. Sale: phone order → choose actual SKUs and quantities → negotiate price → owner confirms invoice **and immediate physical handover** → tax invoice issued and **exactly one stock-out movement** committed. **One invoice per sale**. No negative stock. Drafts never affect stock. Explicit confirmation before irreversible issuance. Invoice printing/downloading does not post inventory.
5. Registered-business buyers ONLY. Record required legal identifiers with status of verification. Format validation is not an authoritative live registry check. Block unverified buyers from issuance until a documented approved manual or authoritative verification step is completed.
6. Two private personal accounts: **director/owner** and **accountant**. Both have broad operational visibility/access, but **only director can give final ATK reporting approval**; accountant records review first. Record each user action. No shared passwords, public registration, anonymous or guest checkout.
7. Purchases from **Albania and Kosovo**. Albania transport → customs broker → clearance → receipt into warehouse. Supplier invoices are in EUR. Store supplier invoice and DUD as separate linked, private attachments. Keep supplier invoice purchase price and import customs/VAT fields separate. Never automatically infer deductible VAT or distort financial accounting just because the owner wants purchase price to be the operational product price. Purchase invoice does not post stock; **physically verified receipt** does. Handle discrepancies even though owner says they are uncommon.
8. Register non-stock business expenses such as rent, electricity, transport and services. Expense documentation and VAT treatment require accountant-approved classification; an expense must never create inventory.
9. Payments in **cash and bank transfer**, including partial payment against **specific invoices**, 15 **calendar** days standard due date (configurable with accountant review). No cash payments over the currently legally applicable B2B threshold; the accountant must verify current legal rule/aggregation before enforcement goes live (do not hard-code uncertain limits). On overpayment, post the actual payment, allocate up to the invoice balance, and track excess as **refundable liability to the customer**, not added invoice revenue or automatic advance. Record the actual refund.
10. There are existing customer receivables and supplier payables by **individual historical invoice** in Excel. Implement controlled import of historical invoice references, dates, parties, open balances and supporting documents, with **zero new stock or tax posting**. Do not import historical Excel transaction lines as new real-time sales or expenses. Historical payments are **not processed until their corresponding historical invoice is imported**. Day-to-day UI shows only **"Borxhet e regjistruara në AL STORE"** without a repetitive warning; a restricted administrator progress view must make the completeness status explicit and prevent full-history claims.
11. Stock list and physical counts already exist but must be **reconciled as of the final Excel day**, signed off, and imported **before first real sale**. Prefer activation on **the first day of a month**. The owner can provide the last invoice number/series used during the calendar year. Continue legal numbering without collisions; annual restart only as approved by accountant. Existing historical obligations can be migrated **later**; current-sale functionality may go live once its mandatory gates pass.
12. Tax invoices must be immutable after issuance. Drafts can be edited. Issued-invoice corrections use legally approved **credit/debit/correction documents**, with reference to original, required short reason (preset choice + optional comment), audit history and separate handling of physical stock correction. No full returns module in MVP; a correction to a mistaken fulfilled quantity must never be modeled as a fictitious purchase/receipt. A financial credit must not automatically create stock-in.
13. In-app downloadable B2B PDF invoice; **no automatic client email delivery** in MVP. Invoice serial sequence by year or accountant-approved series. Robust concurrency/idempotency. No direct ATK login or filing. Monthly **Libri i Blerjes (LB), Libri i Shitjes (LSH)**, VAT reconciliation and official export only after authentic current ATK templates/mapping and accountant approval have been independently verified. Otherwise keep official EDI export disabled and label internal preview **"JO PËR DORËZIM"**.
14. Reports: on-hand stock, stock movement ledger, daily/monthly posted sales, current invoices, outstanding registered receivables/payables, due-date aging, B2B customers/suppliers, tax books/readiness, expenses, full-text/filter search. **No gross-margin/profit reporting** in MVP. No AI accounting or other unnecessary modules.
15. Online-only writes. No offline posting queue or background sync; handle disconnects, repeated clicks/timeouts/two tabs and concurrent users by atomic database transactions and idempotency. Responsive for phone and desktop; simple Albanian UI. Four main home actions: **Shitje e re, Blerje e re, Stoku, ATK / EDI**.
16. Cursor has **NO access to original legacy Excel workbooks**. The owner may later upload verified prepared CSV/XLSX **through the private application**. Do not guess historical SKUs, tax IDs, missing stock, transaction dates or business records.

## B. Technical rules shared by EVERY phase

- One maintained Next.js + React + strict TypeScript web application, responsive accessible design, PostgreSQL, Prisma **or** Drizzle (choose only one), Zod server validation, deterministic decimal arithmetic (never binary JS floats for money/quantities), transaction-safe DB constraints, migrations and tests. Use stable maintained versions actually available in the development environment, not unverified claims about 'latest'.
- One company, one warehouse in current operation; organization scoping in records for isolation, **without implementing complex multi-tenant commercial features**. Use managed authentication, invitation-only accounts, server-side authorization, role-specific approvals, encrypted private document storage, safe logging, secret management, backups and tested restore.
- Business domain distinctions: sale, invoice issue, physical delivery/fulfillment, stock movement, purchase invoice, physical receipt, payment, payment allocation, payment refund, historical opening balance, VAT tax snapshot, report/export, correction, audit. NEVER use one event for two unrelated purposes.
- Protect irreversible operations against retries using durable idempotency keys, database transaction boundaries, unique constraints, locking/concurrency controls and source-event keys. Never silently allow negative stock. Any temporary error must be recoverable without double posting. PDFs and report downloads must be read-only actions.
- All UI and document text in Albanian. Use test/synthetic business data only; no private information in source control, prompts, logs, screenshots or tests. No generic fake 'success' to represent unimplemented functionality.
- **Do only the requested numbered phase. Then STOP.** Follow existing implemented code and ADRs, avoid duplicate modules, do not refactor unrelated features or override working results. A future phase must not proceed unless the previous phase passed QA.
- For EVERY phase create `docs/PHASE_XX.md` detailing functionality, decisions, changed files, migrations, commands actually executed with exit codes, test coverage, screenshots (if relevant), blockers, remaining assumptions, security risks and exact `PASS / FAIL / BLOCKED` verdict. Run formatter, lint, typecheck, unit/integration tests, app build and relevant Playwright E2E tests; **never invent successful tests**. Each feature must pass tests at database, server, and UI layer when applicable.
- Stop an accounting/tax feature at its explicit release gate when law, accountant sign-off, required official template or identity information has not been confirmed. No guesswork about Kosovo VAT classes, import deductibility, invoice legal fields, retention rules, tax point, bank/cash limits or official EDI schema.

## C. Execution order — copy ONE prompt at a time

### PROMPT 00 — Scope freeze, architecture, transactional and compliance blueprint

```text
You are the lead software architect, senior database engineer, Kosovo B2B workflow analyst, UX lead and QA reviewer for AL STORE. Read ALL of AL_STORE_V7_CURSOR_MASTER_PROMPTS.md, especially its LOCKED BUSINESS DECISIONS and shared technical rules. This V7 specification replaces V6 for this implementation; do not mix V6 requirements back in. Before changing code, inspect the private repository and any existing implementations to prevent duplicate work.

Produce: docs/SCOPE.md, DOMAIN_MODEL.md, ROLE_PERMISSION_MATRIX.md, DATABASE_TRANSACTION_BOUNDARIES.md, INVENTORY_INVARIANTS.md, FINANCIAL_DOCUMENT_STATES.md, LEGACY_CUTOVER_PLAN.md, VAT_COMPLIANCE_GATES.md, THREAT_MODEL.md, ADR_001_TECH_STACK.md, PHASE_DEPENDENCIES.md, RELEASE_GATES.md and OPEN_LEGAL_DECISIONS.md.

Model sale, physical delivery, B2B tax invoice, purchase, stock receipt, corrective documents, cash/bank payment, payment refund, opening stock, historical invoice references, expenses, import/DUD and tax books as separate entities. Define which operations are atomic and idempotent. Document last-Excel-day cutover, first-of-month preference, last used invoice number, year-specific invoice series, post-launch historical receivables/payables imports, and restricted 'recorded debts' reporting. Document the accountant review -> director final approval flow. Explicitly document source-of-truth, user journeys and critical failure handling. No legal guessing. List external approvals that block tax release.

Deliver architecture DOCUMENTATION and minimal safe repo scaffold ONLY. No business modules or tax issuance yet. Record outputs and STOP for independent QA.
```

### PROMPT 01 — Application bootstrap and Albanian UI design system

```text
Read V7 spec, phase 00 architectural decisions and QA outcomes. Implement a stable Next.js App Router, React, strict TypeScript, Tailwind and accessible component primitives. Build a polished, restrained, credible business application; avoid generic AI-generated dashboards or a code-editor appearance. Light theme by default; optional dark theme only if it does not add complexity. Desktop and phone responsive, with 360/375/430px mobile and 1440px desktop coverage.

Build invitation-only login SCREEN without bypass, app shell and navigational placeholders: Ballina, Shitje e re, Faturat, Klientët, Blerje e re, Furnitorët, Stoku, Pagesat / Borxhet, ATK / EDI, Shpenzimet, Raportet, Cilësimet. Home shows four large actions: Shitje e re, Blerje e re, Stoku, ATK / EDI. Implement Albanian labels, accessible forms, keyboard navigation, proper focus, loading/empty/error states and honest disabled states for unimplemented features. Set up lint/typecheck/test/Playwright scripts, safe error boundaries and environment validation. No operational fake success states, no B2C and no retail/POS controls.

Provide real mobile/desktop screenshots and E2E checks. Do only this phase, document files/commands/results, STOP.
```

### PROMPT 02 — Database, personal accounts, authorizations and audit

```text
Read V7 spec and prior phase outputs. Choose exactly one ORM (Prisma OR Drizzle) with managed PostgreSQL, create migrations and enforce constraints, typed validation and organization isolation. Implement managed invitation-only authentication and private personal user accounts for DIRECTOR and ACCOUNTANT. Broad operational rights for both; only DIRECTOR may final-approve an ATK period/export after ACCOUNTANT review. Both actions are independently attributable. Disable public signup. Enforce ALL permissions server-side, not merely by hiding buttons.

Create durable domain data structures, migrations and keys for: organizations/settings, users/roles/approvals, legal business customers/suppliers and verification state, products/units, opening balances, purchases/purchase lines/receipts, imports/customs DUD links, business expenses, sales/sale lines, tax invoices, invoice series and sequence, fulfillment, immutable stock events, approved inventory adjustments, payments/allocations/refund liabilities/refunds, credit/debit correction documents, historical invoice obligations, VAT rules/tax snapshots, reporting periods, LB/LSH snapshots, exports, private document links, audit events, idempotency keys. Differentiate legal issued documents from editable drafts and historical reference records.

Add key unique/foreign/check constraints, decimal precision, local document dates versus UTC instants, indexes and clear transaction boundaries. Add cross-role, denied action, cross-company and document security tests. No hard-coded owner fiscal identity or credentials. Record migrations, rollback method and test evidence. STOP.
```

### PROMPT 03 — Master data: products, registered business customers, suppliers

```text
Build secure Albanian CRUD for products (~100–500 SKUs), business customers and suppliers. Products have immutable unique SKU, name, category aluminium/PVC/accessories/other, canonical unit strictly kg/m²/copë, active status, optional barcode and optional purchase reference price; support duplicate display names but not duplicate SKU. Do not implement profile-length variants, cutting, multi-warehouse or general unit conversions. Unit changes after stock postings must be blocked except an explicit auditable approved migration.

Customer MUST represent a registered business. Capture accountant-approved mandatory legal name, IDs and billing information. Clearly show whether identity is manually verified, format-validated or officially verified; never claim authoritative registry lookup unless a trusted integration actually exists. Only verified business buyers may receive an issued tax invoice. Supplier record should support country (Kosovo/Albania), currency EUR, legal identifiers and invoice references. Role checks server-side and audit for changes. Add fast SKU/customer search, sensible duplicate warnings, Albanian form errors, 3-decimal quantity/price data conventions, large touch controls. Use synthetic data and run tests. STOP.
```

### PROMPT 04 — Validated product import, physically confirmed opening stock and cutover setup

```text
Build private owner-controlled import via prepared CSV/XLSX uploads INSIDE the running AL STORE app; development AI must not need original Excel files. Support dry-run preview, column mapping, file validations, SKU uniqueness, allowed units kg/m²/copë, 3-decimal quantities, row-level errors, duplicate detection, all-or-nothing or explicitly reviewed partial approval, and a full audit of import batches. Never infer historical inventory from AL/PVC total summaries or old invoice totals.

Build signed physical opening-stock setup keyed by product SKU/unit: verified counts reconciled to the FINAL EXCEL WORKDAY, a named cutover instant, approval and immutable stock opening source-event IDs. Prevent any real sale of a SKU whose verified opening status is unknown. Distinguish verified zero stock from UNKNOWN stock. Use one real warehouse. Collect the LAST ISSUED INVOICE SERIES/NUMBER for the chosen calendar year, but do not issue invoices in this phase; approval of numbering belongs to accountant release gate. Store intended first-of-month start date. Old business records are not imported as live transactions. Run dry-run safety/duplicate tests and rollback/idempotency tests. STOP.
```

### PROMPT 05 — Transaction-safe stock engine and integrity reconciliation

```text
Implement an authoritative stock movement ledger with correct database transactions, unique source event IDs, idempotency keys, row locking/concurrency control, and a verified stock balance read model that can be reconciled from the ledger. Allowed inventory sources are: signed opening count, approved actual purchase receipt, confirmed actual sale fulfillment, approved physical correction/adjustment, and physically verified goods returned only where an explicit accountant/owner-approved exceptional correction applies. A tax correction document, payment, PDF download, preview, report or user refresh NEVER changes stock by itself.

Default is NO NEGATIVE STOCK: concurrent transactions must not overdraft a SKU. Enforce exact-once posting with duplicate clicks, flaky network, repeated HTTP requests, separate tabs and simultaneous account sessions. Treat inventory quantities as fixed decimal with 3 places; distinct SKU/unit cannot be combined. Provide an Albanian stock history and readable insufficient-stock explanation. Test concurrent sales, duplicate receipt, reversal/correction of a mistaken delivery amount, ledger-vs-balance reconciliation and transaction failure after DB commit. Do not implement sales UI yet. STOP.
```

### PROMPT 06 — VAT rules and decimal-safe tax calculation BEFORE invoicing

```text
Implement a configurable, ACCOUNTANT-REVIEWED VAT/tax classification and calculation core BEFORE legal invoice issuing is enabled. Do NOT guess Kosovo tax rates, exemptions, reverse-charge rules, import deductibility, tax-point dates or LB/LSH columns. Support effective-dated categories and audited approvals, separate sales/output VAT from purchases/input VAT, and purchase invoices from customs declarations/DUD. Input selling prices are negotiated EXCLUDING VAT and can have 3 decimal places; quantities 3 decimal places; use decimal-safe calculations and an accountant-approved 2-decimal currency rounding policy. Store immutable rule snapshots/tax results on issued legal documents.

The owner prefers supplier purchase price as the operational price; do not silently fold import VAT/transport/customs into that field. Keep necessary import tax/customs bookkeeping separately and document decisions about valuation/cost accounting for accountant review. Handle domestic purchases, imports from Albania, non-stock business expenses and potential credits with separate classifications. Provide official legal sign-off gates; unverified configuration must BLOCK issuance, not default silently. Add approved synthetic test vectors and edge-case tests for fractional quantities/prices, rounding, tax categories, discounts not present in normal sale, and corrections. STOP.
```

### PROMPT 07 — B2B sale drafts and negotiated pricing workflow

```text
Implement the owner’s actual Albanian wholesale sale journey: search and select a manually/authoritatively verified registered business buyer -> add real SKU lines with quantities in kg/m²/copë (3 decimals) -> enter negotiated unit price BEFORE VAT (3 decimals) -> show exact VAT and EUR totals -> stock availability check -> save/edit draft -> mandatory final review screen. One tax invoice is associated with one confirmed sale. Do not require a standard pricelist, retail checkout, customer discount module, barcode scanning or a POS.

Draft sale must never reserve/deduct stock by itself. Distinguish preview and actual issuance. The final review must clearly show buyer, products, units, quantities, agreed prices, taxes, payment terms standard 15 calendar days, available stock and an explicit acknowledgment that goods are being physically handed over immediately. Do not issue yet in this phase; integrate cleanly with later phase 08. Add invalid buyer, race-preview stale stock, bad quantity/price and slow network tests. STOP.
```

### PROMPT 08 — Atomic B2B tax invoice issuance, fulfillment and PDF

```text
Implement final legal B2B issuance from verified sale drafts only when invoice legal particulars, tax configuration, serial format/last-used number and release sign-offs have been approved. On final confirmation, atomically issue ONE immutable tax invoice and post ONE physical delivery/stock-out event for the same sale. Use server-side authorization, database locking, unique invoice series (year-aware), durable idempotency keys and unique fulfillment source IDs. Protect against two simultaneous users, duplicate submit, timeout after success and same-browser retries. Absolutely never use MAX(invoice_number)+1 without proper locking/sequence protections.

Generate stored/reproducible downloadable PDF in Albanian with legally approved seller/buyer fields, invoice number/date, precise SKU lines, quantities, net prices, VAT and total, EUR rounding, due date 15 days. PDF generation/download/print must never change stock or allocate payments. No automatic emailing. Issued invoice fields/tax snapshot are immutable; preview remains draft and has no legal invoice number. Invoice number continuity must account for Excel numbers already used in that year; calendar-year reset only with accountant approval. Test PDF snapshots, 3-decimal lines/2-decimal totals, concurrency, sequence collision and exactly-once stock. STOP.
```

### PROMPT 09 — Safe invoice corrections and separate stock corrections

```text
Implement correction workflow for ISSUED B2B invoices; no silent edit/delete, no legal-document overwrite. Drafts remain editable. For corrections require a short selection of correction reason (quantity incorrect, agreed price incorrect, buyer details issue, other), and any legally required explanatory field. Create accountant-approved credit/debit/correction document with its own immutable identity and reference to original invoice, approved VAT treatment and report-period handling. Expose original and corrected chain in UI in Albanian. Do not build a large everyday merchandise returns module.

Separate finance and inventory: a credit note alone NEVER adds stock. If original invoice incorrectly stated delivery of 100 kg but only 10 kg were physically handed over, correct the stock ledger through one authorized auditable physical fulfillment correction of 90 kg while creating the approved financial correction separately. Avoid fictitious purchases/receipts and double counts. Handle already paid, partially paid, already declared and closed-period invoices safely with accountant review. Test all flows, amounts, VAT and re-download invariants. STOP.
```

### PROMPT 10 — Local purchases, Albania import/DUD, suppliers and physical receipt

```text
Implement Albanian procurement for suppliers from Kosovo and Albania, in EUR. Track supplier invoice with invoice date/number, linked actual SKU lines, approved purchase price and document attachments. Support import record linking supplier invoice, private DUD/declaration document, customs reference/date, recorded relevant customs amounts and import VAT as SEPARATE fields with accountant-reviewed classification. Do not invent duty rates, tax deductions or cost capitalization. Files must be accessible only to authorized users.

Purchases have separate invoice capture and PHYSICAL goods receipt: entering supplier invoice or payment does not create stock. Confirming physical receipt creates one stock-in event exactly once. Owner says invoiced/received quantities generally match; still support a discrepancy hold and partial/mismatched receipt with review. Support later invoice linking to a previously received shipment, return-to-supplier/correction records only where needed, duplicate supplier invoice warnings and auditing. Do not issue B2C documents. Test imports, domestic purchases, duplicate DUD/reference, duplicate receipt, private file permissions, VAT document source and stock invariants. STOP.
```

### PROMPT 11 — Non-inventory business expense documents

```text
Create a practical Albanian expense register for rent, electricity, transport, services and other non-stock business costs. Store vendor, legal invoice/reference, date, category, currency EUR, net amount, approved tax classification, VAT amount, attached private evidence, invoice status and related payment if any. Support supplier invoice de-duplication across purchase/expense modules. These records may feed accountant-reviewed LB inputs but do not automatically imply deductible VAT. An expense MUST NEVER create inventory or sale fulfillment.

Use approved VAT rule engine and reversible draft vs posted document lifecycle, access control, audit trail and correct reporting period semantics. If a document is unclear, require accountant review rather than silently treating all input VAT as deductible. Test duplicate reference, attachments, edits to unposted drafts, corrections to posted expense and no stock changes. STOP.
```

### PROMPT 12 — Cash/bank payments, allocations, receivables and refund liabilities

```text
Build secure Albanian payment workflows for customers and suppliers: bank transfer and cash where the currently accountant-approved B2B rules permit. User explicitly selects invoice(s) to pay. Support full and partial payment, payment date/reference, immutable payment record, exact-cent allocations, derived remaining balances, due dates default 15 calendar days, aging and printable customer/supplier statements. No manually typed running balance as the system source of truth.

If customer pays 230 EUR against a 200 EUR unpaid invoice: record actual received 230 EUR, allocate only 200 EUR, and create an auditable 30 EUR refundable customer liability pending a separate recorded refund; not invoice revenue, not automatically a prepayment. Require explicit confirmation/classification. Never allocate above outstanding amount or duplicate bank transfer on retries. Cash threshold control must be accountant-reviewed for CURRENT Kosovo B2B law and transaction aggregation, configurable from protected settings, not guessed from stale FAQs. Payment, refund and allocation must not alter stock. Test allocation to specific invoices, partials, overpayments, refund, duplicate references, concurrent double allocation, money precision, unauthorized actions and reporting consistency. STOP.
```

### PROMPT 13 — Controlled migration of old unpaid customer and supplier invoices

```text
Build a SEPARATE historical-obligation importer, via the private app, for VERIFIED prepared CSV/XLSX records from the owner; Cursor must not need source legacy Excel files. Each reference record includes party, original invoice number/series, issue date, original total (when verified), remaining balance, currency EUR, source import batch and optional private attachment. Support both customer receivables and supplier payables, exact-invoice identity and duplicate detection. Dry run and validate all records before owner acceptance, with import approval/rejection, correction audit and reversible unposted batch staging.

Legacy obligation records are NOT newly issued tax invoices, stock movements, new sales or new input-VAT expenses. They must NOT alter present stock, income, new-period LB/LSH or invoice legal sequences. They can accept payment ONLY after that specific old invoice reference is imported/approved. Do not match old AL/PVC aggregates to SKU inventory. The system may go live after confirmed opening stock and current-invoice/tax gates even if historical debts have not yet been migrated. Day-to-day debtor UI should show only "Borxhet e regjistruara në AL STORE" as requested, WITHOUT repetitive warning banners; retain restricted admin import progress and report metadata so partial history is not represented as complete history. Test duplicate legacy invoices, debtor/supplier matching, current+legacy invoice number overlaps, eventual payment, no double VAT/stock and rejected imports. STOP.
```

### PROMPT 14 — Monthly purchase book (LB) and sales book (LSH) projections

```text
Create separate internal LB and LSH monthly projections from authoritative posted legal tax documents, not from stock movement, payment, PDF download, or old Excel mirrored data. LSH derives from issued B2B invoices and approved legal corrections; LB derives from approved Kosovo supplier invoices, Albania import evidence (DUD as relevant), accepted expenses and relevant approved correction docs under ACCOUNTANT-SIGNED mapping. Distinguish the supplier commercial invoice, customs evidence and input VAT so the same acquisition is never double counted.

Use accountant-approved tax-point/local document-date rules, effective VAT classifications, 2-decimal accounting totals and fully reconcilable links to original source documents. Display Albanian monthly review with filters, document identifiers, category totals, flags for duplicates/missing identifiers/late adjustments/inconsistent VAT, and expected tax periods. Imported historical obligation references from phase 13 NEVER create tax-book entries. No officially labeled EDI export in this phase. Add tests for date boundaries, timezone, corrections, partial/closed periods, imports, expenses, source uniqueness and decimal sum reconciliation. STOP.
```

### PROMPT 15 — Official ATK/EDI file adapter with authenticity verification gate

```text
Implement an ISOLATED adapter for official monthly Kosovo ATK/EDI LB and LSH workbook export. BEFORE enabling: fetch authentic current ATK templates and written instructions from the official ATK site, record URL, retrieval timestamp, file hashes/checksums, exact sample version and approved column mappings in docs/ATK_TEMPLATE_PROVENANCE.md. The accountant must review output against the current official template with synthetic business records. Do not invent EDI layout, names, types, blank codes, identifier conventions, categories or tax calculations. The tool must never log into ATK or submit filings automatically.

If official templates, mapping or acceptance tests cannot be independently verified, OFFICIAL export remains DISABLED and UI must say "Eksporti ATK është në pritje të verifikimit". Permit an internal preview XLSX/CSV clearly labeled "JO PËR DORËZIM", never call it official. After verified approval, generate separate deterministic LB and LSH exports with month, document-source audit, template version, file hash and reproducible output. Test structural compatibility with authentic sample template and accountant-reviewed examples; provide the actual QA evidence, not unverified claims of EDI acceptance. STOP.
```

### PROMPT 16 — Accountant review, director approval and monthly VAT period closing

```text
Build tax-period lifecycle and approvals: OPEN -> READY_FOR_ACCOUNTANT_REVIEW -> ACCOUNTANT_REVIEWED -> DIRECTOR_APPROVED -> CLOSED, with controlled amendment workflow. The ACCOUNTANT can review, flag, and mark reviewed but CANNOT finally approve the month. Only DIRECTOR can final-approve after recorded accountant review. The director's broad operating role must not bypass this separation. Each approval logs actor, date/time, period snapshot hash and comment/review status. Any changes after review must invalidate prior approval and require fresh review if they change book totals.

Provide month VAT reconciliation from approved sales VAT, allowable purchase/import VAT and corrections, with accountant-approved classification and links to LB/LSH sources. Do NOT claim EDI is filed: allow manual entry of authentic EDI filing receipt/date only after actual owner submission, with supporting evidence. Closed months cannot be silently altered: use audited corrections/amendments and appropriate approved tax period handling. Accommodate the first-of-month cutover and transitional late documents. Test privileges, re-approval, locked closed periods, backdating, corrections, report recomputation and complete audit trail. STOP.
```

### PROMPT 17 — Simple dashboard, search and practical reports

```text
Build a clean, highly readable Albanian home for two users, emphasizing the four large actions: Shitje e re, Blerje e re, Stoku, ATK / EDI. Add today's confirmed B2B sales, invoices due under 15-day default, recorded outstanding customer/supplier obligations, low or unavailable stock by SKU, purchase receipts, current-month tax readiness and recent transactions. Never equate issued invoices with money received. No profit/gross-margin module, no fancy irrelevant KPI cards.

Build fast filtered search across customer business name, invoice number/series, supplier, SKU and date. Add reports for posted sales, products sold, inventory on-hand and movements, payment allocation, expenses and tax projections. All numbers must link back to authoritative source records. Day-to-day debt headings explicitly indicate "Borxhet e regjistruara në AL STORE" without a constant migration warning; admin-only progress remains available. Exports CSV/PDF must include selected filters and clear internal/not-for-official-submission labeling where relevant. Test mobile readability, larger data sets, date ranges, restricted records, empty states and accuracy. STOP.
```

### PROMPT 18 — UX simplicity audit, mobile workflows and accessibility

```text
Evaluate EVERY completed screen against the practical owner workflow. The owner is non-technical and usually wants to issue a B2B invoice in three core steps: choose business, choose actual SKUs and quantities with negotiated prices, review/confirm delivery and invoice. Simplify forms but never hide required VAT fields from final confirmation, suppress legal corrections or skip business validation. Large controls for phone, fast SKU search, visible loading, non-duplicating submit, clean validation in correct Albanian, accessible contrast, keyboard/screen-reader support, consistent date/number display.

Test at 360px, 375px, 430px and 1440px; slow network, keyboard-only, mobile devices with long item lists, bad dates, invalid prices, empty states, duplicate submissions and unexpected session expiry. No accidental issuance by pressing Enter; irreversible action always gets an explicit review screen. Make minimal targeted improvements rather than redesigning working components. Document screenshots, user-journey issues, fixes, tests and objective PASS/FAIL findings. STOP.
```

### PROMPT 19 — Production security, staging, backup, restore, domain and deployment

```text
Harden all modules for real private business use. Verify server authorization and role boundaries on every read/write/API, invitation-only auth, private attached invoice/DUD storage and signed access links, CSRF protection where relevant, rate limits, encrypted transfer, secret/environment handling, safe logs/redaction, OWASP-style input handling, dependency scans, backups with retention and ACTUAL TESTED RESTORE into isolated environment. No unauthorized public invoice URLs; no fiscal data in public repos or CI artifacts. Document required data retention/backup/legal rules for accountant review rather than guessing.

Create separate staging and production DB/storage/secrets, reviewed schema migration/deploy pipeline, rollback plan and operational error monitoring without exposing private content. Set up HTTPS/domain only after real owner DNS details are available; don't invent them. Disaster-recovery procedures must include restore time/data-loss assumptions and reconciliation of invoices after failures. Run tests for revoked users, privilege escalation, document URL leakage, failed deploy, backup restore, orphaned files, concurrency after retry and migration rollback. STOP.
```

### PROMPT 20 — Independent end-to-end audit, first-of-month cutover and release decision

```text
Conduct an INDEPENDENT full-system audit and prelaunch rehearsal with synthetic business data; do not assume previous phase PASS means entire system works. Test: verified opening SKU AL-01=100.000 kg; Albania purchase with supplier invoice+DUD and verified physical receipt of 20.000 kg -> stock 120.000; B2B issued invoice and actual delivery 15.000 kg -> stock 105.000; re-download invoice PDF 10x, record partial payment, produce LSH: stock stays 105.000. Test audited mistaken fulfillment correction, credit/debit documents, supplier payables, expenses in LB, closed-period amendment, overpayment 230 EUR on a 200 EUR invoice and refund 30 EUR, 15-day due dates, accountant review then director approval, blocked unverifiable official EDI export, and duplicate invoice/receipt attempts.

Simulate concurrent requests selling above availability: must reject overdraft. Test invalid customer status, multi-user access separation, last-used Excel invoice number and year transition, cutover at month boundary, confirmed physically counted opening inventory, historical customer/supplier debt imports AFTER live start with NO stock/VAT/revenue repost, and prohibition on paying an unimported historical invoice. Verify real isolated database restore, mobile UX and all role-boundary tests. Record command lines, exit codes, full evidence, privacy-safe screenshots and an itemized docs/RELEASE_AUDIT.md with PASS/FAIL/BLOCKED.

Require owner sign-off for operational use and accountant sign-off for required B2B invoice fields, VAT classifications, credit/debit process, cash controls, import/DUD rules and current ATK template mapping. Any mandatory gate FAIL/BLOCKED => DO NOT CLAIM PRODUCTION READY and DO NOT issue real invoices. Do not automatically go live. Produce an explicit cutover runbook: freeze old Excel issuance, final stock reconciliation, known invoice series/last serial, verify production backup, test one synthetic invoice in staging, obtain owner authorization, then activate production at chosen first-of-month date. STOP.
```

## D. Independent QA prompt — run after EVERY numbered phase

```text
Act as an independent skeptical QA/security/transaction-integrity reviewer. Read AL_STORE_V7_CURSOR_MASTER_PROMPTS.md, all relevant ADRs, docs/RELEASE_GATES.md and the JUST COMPLETED phase documentation. Inspect actual code and DB migrations rather than trusting the agent's summary. Check whether the phase implemented only the requested scope and respected locked business decisions (Kosovo B2B-only, one stock, kg/m²/copë, 3-decimal quantities/unit prices, 2-decimal currency, no negative stock, accountant reviews / director approves ATK, DUD import separation, no double tax postings or Excel history guessing).

Run the actual available formatter, lint, strict typecheck, app build, unit, DB integration, concurrency, authorization and relevant Playwright tests. Record exact commands and ACTUAL exit codes. Create or extend tests to reproduce discovered bugs; fix problems within the current phase without adding future scope. Check privacy leaks, data migration failures, idempotency, rounding, immutable invoices, proper Albanian strings, role separation, blocked official ATK export unless verified, and meaningful mobile UI screenshots. Do not fabricate evidence, legal compliance or a passing result. Write docs/QA_PHASE_XX.md with PASS/FAIL/BLOCKED, unresolved issues, source files changed, and next-phase readiness. If FAIL/BLOCKED, explain precise remedies and DO NOT START the next numbered prompt. STOP.
```

## E. Message to send Cursor FIRST (after putting this specification in the private repository)

```text
Read AL_STORE_V7_CURSOR_MASTER_PROMPTS.md in full. It is the sole governing specification for AL STORE web development, replacing V6 for this new implementation. The app is PRIVATE Kosovo VAT-registered B2B wholesale, one warehouse, kg/m²/copë, sales to verified registered businesses only, EUR invoices, negotiated price excl. VAT, secure stock ledger, Albania DUD + Kosovo purchases, historical debts later, accountant reviews and director approves ATK. Never build B2C/POS, DEPO BABI, multi-warehouse, manufacturing, email invoice delivery, AI accounting, automatic EDI filing, or unverified tax guesses. Do not access original legacy Excel books. Read PROMPT 00 and implement ONLY that phase now. Deliver real outputs and stop for QA/approval.
```

## F. Release policy / unsupported claims

- A list of prompts **cannot guarantee** legally compliant software. Independent developer/security validation, real DB tests, owner approval, accountant sign-off and real restore test are required.
- **Do not deploy/test real invoices using invented business details**. Enter private legal identity in secure owner settings, not AI chats.
- Current official legal source references to independently reverify before release: [ATK LB/LSH templates](https://www.atk-ks.org/librat-e-blerjes-dhe-te-shitjes/), [ATK B2B tax invoice guidance](https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=135), [ATK credit/debit note FAQ](https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=175), [ATK import DUD FAQ](https://www.atk-ks.org/pyetje-te-shpeshta/?wpfaqpage=171). Links are references, not claims that current templates or rules have been legally approved for this implementation.
- All phases begin on a private repository with protected secrets. If repo/GitHub access is unavailable, the Agent must state the blocker instead of claiming it created anything remotely.
