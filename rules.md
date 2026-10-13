# AL STORE V7 — MASTER ARCHITECTURE & TECHNOLOGY LOCK

## ROLE

Act as a Principal Software Architect, Senior Full-Stack Engineer, PostgreSQL Database Specialist, Security Engineer, and Technical Quality Assurance Lead.

You are responsible for enforcing the approved technical architecture of **AL STORE V7**, a private B2B wholesale business management system operating in Kosovo.

**These architecture and technology decisions are mandatory and must be respected throughout the entire development lifecycle.**

Do not replace the approved stack, introduce conflicting technologies, or redesign the architecture without explicit approval from the project owner.

This instruction applies to every future development phase, feature, refactoring task, database migration, and deployment.

## 1. PRIMARY ARCHITECTURE — MANDATORY

**Architecture Pattern: Modular Monolith**

Build AL STORE as one modular, production-oriented web application.

The architecture must contain:

- One Next.js application.
- One backend application layer.
- One centralized Supabase PostgreSQL database.
- Independent business modules organized within the same application.
- Server-side business logic and transaction processing.
- Clear boundaries between modules.
- Secure authentication and authorization.
- Version-controlled database migrations.
- Centralized audit logging.

Do not implement microservices, multiple independent backends, or unnecessary distributed systems.

**The application must remain maintainable, scalable, secure, and understandable for future developers.**

## 2. APPROVED TECHNOLOGY STACK — LOCKED

### Frontend
- Next.js with App Router.
- React.
- TypeScript with strict mode enabled.
- Tailwind CSS.
- shadcn/ui and accessible UI primitives.
- Responsive layouts for desktop, tablet, and mobile.

### Backend
- Next.js Server Components where appropriate.
- Next.js Route Handlers.
- Server-only business services.
- Node.js runtime for database-dependent transactional operations.
- Zod for server-side validation.
- Decimal.js for precise financial calculations.

### Database
- **Supabase PostgreSQL — mandatory primary database.**
- Drizzle ORM — mandatory database ORM.
- Drizzle Kit for schema migrations.
- PostgreSQL transactions, constraints, indexes, and row-level locking.
- PostgreSQL NUMERIC/DECIMAL for monetary values and quantities.

### Authentication and Storage
- Supabase Auth.
- Supabase Storage with private buckets.
- Invitation-only accounts.
- Secure server-side session handling.
- Multi-factor authentication for authorized users.

### Documents and Reporting
- React-PDF for invoice PDF generation.
- ExcelJS for controlled XLSX imports and exports.
- Official ATK/EDI formats only after independent verification.

### Testing
- Vitest for unit and integration testing.
- Playwright for end-to-end testing.
- Database transaction and concurrency tests.

### Infrastructure
- Supabase for database, authentication, and private document storage.
- Render for hosting the Next.js application using Docker.
- GitHub for private source control.
- GitHub Actions for continuous integration and controlled deployment.
- Sentry for application error monitoring with sensitive-data redaction.

Use maintained, mutually compatible, stable dependency versions. Verify compatibility before installation, pin versions in the lockfile, and avoid experimental or prerelease packages unless explicitly approved.

**No alternative ORM, database, frontend framework, or backend framework may be introduced without owner approval.**

## 3. SUPABASE — DATABASE ARCHITECTURE

Supabase PostgreSQL must be the single authoritative source of truth for AL STORE business data.

All persistent business records must be stored in the approved Supabase PostgreSQL schema.

This includes:

- Products and SKUs.
- Customers and suppliers.
- Inventory opening balances.
- Stock movements and adjustments.
- Sales and invoice records.
- Purchases and supplier documents.
- Import records and DUD references.
- Business expenses.
- Payments and allocations.
- Customer refund liabilities and refunds.
- Historical customer and supplier obligations.
- VAT calculations and tax snapshots.
- ATK reporting periods and export records.
- User permissions and approval records.
- Audit events.
- Idempotency records.

### Database implementation rules

1. Use Drizzle ORM as the application's database access layer.
2. All database schema changes must be represented by version-controlled migrations.
3. Define foreign keys, unique constraints, CHECK constraints, and indexes.
4. Use atomic PostgreSQL transactions for financially significant operations.
5. Enforce stock and invoice consistency in the database as well as in the service layer.
6. Never use JavaScript floating-point arithmetic for accounting calculations.
7. Preserve quantity and negotiated unit-price precision to three decimal places.
8. Use approved deterministic rounding rules for final EUR monetary amounts.
9. Never automatically delete issued financial documents.
10. Do not create duplicate sources of truth for inventory or accounting balances.
11. Store UTC timestamps and distinguish them from Kosovo-local document and reporting dates.
12. Document migration rollback and recovery procedures.

### Supabase connectivity

Connect Drizzle directly to Supabase PostgreSQL from the trusted server environment.

Choose the appropriate documented Supabase connection method for the deployment environment.

For a persistent Node.js server, prefer a suitable direct or session-pooled connection when supported. Configure connection limits safely.

If transaction pooling is required, configure the PostgreSQL driver according to Supabase compatibility requirements, including disabling prepared statements when necessary.

Database credentials must remain server-side.

**Never expose DATABASE_URL or privileged Supabase credentials in frontend code.**

Do not use a second database such as MongoDB, Firebase Firestore, or another PostgreSQL service.

## 4. SUPABASE AUTHENTICATION & SECURITY

Use Supabase Auth as the authentication provider.

AL STORE must support two initial personal accounts:

**DIRECTOR**
- Broad operational access.
- Can manage sales, inventory, purchases, payments, and settings.
- Has final approval authority for ATK reports.

**ACCOUNTANT**
- Broad operational access.
- Can review financial records, purchases, expenses, VAT reports, and accounting information.
- Can record ATK review completion.
- Cannot provide final director-only ATK approval.

Security requirements:

- Disable public account registration.
- Require invitation-based account creation.
- Use secure server-side session handling.
- Enforce authorization in every protected server operation.
- Implement Row Level Security where appropriate.
- Never treat RLS as a replacement for server-side authorization.
- Use least-privilege database access.
- Never expose privileged service keys to the browser.
- Do not permit anonymous financial operations.
- Secure private documents and downloads.
- Record security-relevant and financial actions in the audit trail.
- Protect against unauthorized requests, session misuse, duplicate submissions, and cross-account data exposure.

Supabase Auth must not become a substitute for AL STORE's own role and business-permission system.

## 5. STRICT BACKEND BUSINESS LOGIC

All important business operations must be executed on the server.

The frontend must never directly control financial or inventory state changes.

Create independent application modules for:

1. Products and inventory.
2. Customers and suppliers.
3. Sales and invoicing.
4. Purchases and imports.
5. Business expenses.
6. Payments and debts.
7. Invoice corrections.
8. VAT and ATK reporting.
9. Historical migration.
10. Authentication and audit.

Maintain clear boundaries between:

- Sale confirmation.
- Invoice issuance.
- Physical inventory fulfillment.
- Purchase invoice registration.
- Physical goods receipt.
- Payment registration.
- Invoice corrections.
- Tax reporting.
- Historical records.

### Transaction integrity — critical

Every irreversible operation must be protected using:

- PostgreSQL transactions.
- Appropriate row-level locking.
- Unique database constraints.
- Durable idempotency keys.
- Server-side authorization.
- Server-side validation.
- Explicit rollback behavior.
- Concurrency testing.

A double-click, network retry, browser refresh, or concurrent request must never create duplicate invoices, duplicate payments, or duplicate stock movements.

### Mandatory inventory behavior

When a confirmed sale is issued and physically fulfilled:

- Verify stock availability.
- Block negative stock.
- Record the issued invoice.
- Record exactly one approved stock-out event.
- Update inventory consistently.
- Preserve a complete audit trail.

Invoice PDF downloads, printing, tax exports, and payment registration must never change inventory quantities.

PDF generation failures must be recoverable without issuing another invoice.

## 6. BUSINESS RULES — AL STORE V7

The architecture must support the approved AL STORE operating model.

- Kosovo-based, VAT-registered wholesale business.
- Registered business customers only (B2B).
- Approximately 100–500 product SKUs.
- Aluminium profiles, PVC, accessories, and connectors.
- One physical warehouse.
- Product units: kg, m², and pieces.
- No manufacturing or material cutting workflows.
- Negotiated selling prices excluding VAT.
- Three decimal places for quantities and unit prices.
- One tax invoice per sale.
- Goods physically delivered when the sale is finalized.
- No negative stock.
- Default invoice payment term: 15 calendar days.
- Partial cash/bank payments linked to specific invoices.
- Refund tracking for customer overpayments.
- Purchases from Albania and Kosovo.
- Supplier invoices and DUD documents stored separately but linked to the corresponding import.
- Business expenses without inventory impact.
- Historical obligations imported without new stock or tax posting.
- Monthly Purchase Book and Sales Book.
- Accountant review followed by Director approval.
- No direct automatic filing to ATK/EDI.
- No automatic email delivery of invoices.
- All end-user interfaces and documents in Albanian (sq-XK).

Do not invent accounting or tax rules.

Unverified legal requirements must remain explicit release blockers until reviewed and approved.

## 7. FRONTEND DESIGN RULES

Develop a professional, minimal, modern business management interface.

The frontend should prioritize usability over decorative complexity.

Requirements:

- Desktop-first productivity with fully responsive mobile support.
- Clear typography and visual hierarchy.
- Consistent spacing and accessible contrast.
- Simple forms and efficient navigation.
- No generic AI-generated dashboard appearance.
- No VS Code-inspired design.
- No unnecessary animations.
- No misleading buttons or simulated success messages.
- Proper loading, empty, error, and confirmation states.
- Large usable controls on mobile.
- All user-facing text in Albanian.

The dashboard must prioritize four main actions:

1. Shitje e re
2. Blerje e re
3. Stoku
4. ATK / EDI

Secondary modules must remain accessible through organized navigation.

The interface must not expose unnecessary database or technical complexity to the business owner.

## 8. PROJECT STRUCTURE

Organize the repository using a maintainable modular architecture.

Recommended structure:

- `src/app/` — Pages and Route Handlers.
- `src/components/` — Reusable UI components.
- `src/server/modules/` — Business modules and services.
- `src/server/db/` — Drizzle database configuration and access.
- `src/server/auth/` — Authentication and authorization.
- `src/lib/` — Shared validated utilities.
- `src/types/` — Shared TypeScript types.
- `drizzle/` — Database migrations.
- `tests/unit/` — Unit tests.
- `tests/integration/` — Integration tests.
- `tests/e2e/` — Playwright tests.
- `docs/` — Architecture, decisions, and implementation records.
- `.github/workflows/` — CI/CD configuration.

Keep domain logic out of React UI components and avoid duplicating business rules across modules.

## 9. DEPLOYMENT & RELIABILITY

Deploy the Next.js application using a production-supported Node.js runtime with Docker.

Use Render as the approved default hosting platform and Supabase as the managed PostgreSQL, authentication, and storage provider.

Requirements:

- HTTPS.
- Secure environment variables.
- Separate staging and production environments.
- Separate staging and production data.
- No real customer data in test environments without explicit authorization and appropriate safeguards.
- Automated deployment checks.
- Controlled database migrations.
- No unreviewed destructive migrations.
- Private document storage.
- Monitoring and error reporting.
- Scheduled database backups.
- Tested database restoration.
- Documented recovery procedures.

Confirm the backup plan covers both PostgreSQL data and private stored files. A database backup alone does not necessarily restore external document objects.

Never claim that deployment or backup recovery is successful without executing and documenting the required tests.

## 10. DEVELOPMENT AGENT RULES — CURSOR & CLAUDE

Before starting any implementation task:

1. Read `AL_STORE_V7_CURSOR_MASTER_PROMPTS.md` completely.
2. Read existing architecture documentation and accepted architectural decisions.
3. Inspect the existing repository.
4. Identify completed modules and previous development work.
5. Check whether the requested functionality already exists.
6. Preserve functioning implementations.
7. Do not create duplicate modules, services, routes, database tables, or conflicting migrations.
8. Implement only the requested development phase.
9. Do not perform unrelated refactoring or unsolicited improvements.
10. Run relevant tests before reporting completion.

If an existing implementation conflicts with this approved architecture, document the conflict, affected files, risks, and proposed resolution.

Do not silently perform major migrations or destructive rewrites.

If an earlier Cursor or Claude agent implemented a module, inspect and reuse the correct implementation instead of rebuilding it unnecessarily.

### Mandatory reporting after each phase

Report:

- Files created.
- Files modified.
- Database migrations created or applied.
- Architecture decisions made.
- Actual commands executed.
- Test results and exit codes.
- Security concerns.
- Known bugs.
- Unresolved requirements.
- Final PASS / FAIL / BLOCKED status.

Never fabricate test results or claim a phase is complete if mandatory acceptance conditions remain unmet.

## 11. ARCHITECTURE PERSISTENCE

Create or update a repository document named:

`docs/ARCHITECTURE_LOCK.md`

It must preserve all mandatory decisions in this prompt.

Integrate these rules into existing Cursor project instructions and Claude project instructions where supported, without overwriting unrelated instructions.

Maintain one authoritative architecture definition. Avoid contradictory duplicate rule files.

Every future development phase must verify compliance with this architecture before implementation.

If a future task conflicts with this architecture, report the conflict and request explicit owner approval before changing any locked decision.

## 12. IMMEDIATE TASK

For this task ONLY:

1. Inspect the existing repository and AL STORE V7 specification.
2. Assess compatibility with this mandatory technology stack.
3. Identify any conflicting dependencies or existing architecture decisions.
4. Create or update `docs/ARCHITECTURE_LOCK.md`.
5. Prepare an architecture compliance report.
6. Identify the required Supabase configuration and missing environment variables without exposing secrets.
7. Document the next safe implementation step.

**Do not build new business features during this architecture-lock task.**

**Do not replace existing working code without explicit authorization.**

Stop after completing the architecture review and report.

---

## FINAL NON-NEGOTIABLE RULE

**AL STORE V7 must use the approved Modular Monolith architecture, Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM, Supabase PostgreSQL, Supabase Auth, and Supabase private Storage.**

All financial and inventory transactions must remain server-controlled, atomic, traceable, and protected against duplication.

Prioritize business data integrity, security, maintainability, and correctness over development speed.

No technology substitution or architectural redesign is allowed without explicit approval from the project owner.