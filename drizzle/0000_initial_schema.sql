CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"approval_kind" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"requester_id" uuid,
	"requires_four_eyes" boolean DEFAULT false NOT NULL,
	"decision" text NOT NULL,
	"comment" text,
	"subject_hash" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_decision_ck" CHECK ("app"."approvals"."decision" in ('APPROVED', 'REJECTED', 'REVIEWED', 'INVALIDATED')),
	CONSTRAINT "approvals_actor_role_ck" CHECK ("app"."approvals"."actor_role" in ('DIRECTOR', 'ACCOUNTANT')),
	CONSTRAINT "approvals_four_eyes_ck" CHECK (not "app"."approvals"."requires_four_eyes" or ("app"."approvals"."requester_id" is not null and "app"."approvals"."requester_id" <> "app"."approvals"."actor_id"))
);
--> statement-breakpoint
CREATE TABLE "app"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"request_id" text,
	"idempotency_key" text,
	"before_hash" text,
	"after_hash" text,
	"safe_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "audit_events_actor_role_ck" CHECK ("app"."audit_events"."actor_role" is null or "app"."audit_events"."actor_role" in ('DIRECTOR', 'ACCOUNTANT'))
);
--> statement-breakpoint
CREATE TABLE "app"."idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"key" text NOT NULL,
	"operation" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"result_type" text,
	"result_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "idempotency_keys_scope_uq" UNIQUE("org_id","actor_id","key"),
	CONSTRAINT "idempotency_keys_status_ck" CHECK ("app"."idempotency_keys"."status" in ('IN_PROGRESS', 'COMPLETED')),
	CONSTRAINT "idempotency_keys_completed_ck" CHECK (("app"."idempotency_keys"."status" = 'COMPLETED') = ("app"."idempotency_keys"."completed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."settlement_targets" (
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_targets_target_type_target_id_pk" PRIMARY KEY("target_type","target_id"),
	CONSTRAINT "settlement_targets_type_ck" CHECK ("app"."settlement_targets"."target_type" in ('TAX_INVOICE', 'DEBIT_DOCUMENT', 'PURCHASE_INVOICE', 'EXPENSE', 'HISTORICAL_OBLIGATION', 'REFUND_LIABILITY'))
);
--> statement-breakpoint
CREATE TABLE "app"."user_roles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"role" text NOT NULL,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_role_ck" CHECK ("app"."user_roles"."role" in ('DIRECTOR', 'ACCOUNTANT'))
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "users_status_ck" CHECK ("app"."users"."status" in ('INVITED', 'ACTIVE', 'DISABLED')),
	CONSTRAINT "users_disabled_at_ck" CHECK (("app"."users"."status" = 'DISABLED') = ("app"."users"."disabled_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."cutover_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"planned_cutover_date" date NOT NULL,
	"last_excel_day" date NOT NULL,
	"cutover_instant" timestamp with time zone,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"signed_by" uuid,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cutover_plans_status_ck" CHECK ("app"."cutover_plans"."status" in ('DRAFT', 'LOCKED', 'EXECUTED')),
	CONSTRAINT "cutover_plans_dates_ck" CHECK ("app"."cutover_plans"."last_excel_day" < "app"."cutover_plans"."planned_cutover_date")
);
--> statement-breakpoint
CREATE TABLE "app"."org_legal_identity_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"identity" jsonb NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"proposed_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_legal_identity_versions_uq" UNIQUE("org_id","version_no"),
	CONSTRAINT "org_legal_identity_versions_status_ck" CHECK ("app"."org_legal_identity_versions"."status" in ('PROPOSED', 'APPROVED', 'SUPERSEDED', 'REJECTED')),
	CONSTRAINT "org_legal_identity_versions_four_eyes_ck" CHECK ("app"."org_legal_identity_versions"."approved_by" is null or "app"."org_legal_identity_versions"."approved_by" <> "app"."org_legal_identity_versions"."proposed_by")
);
--> statement-breakpoint
CREATE TABLE "app"."org_settings" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"default_payment_term_days" integer DEFAULT 15 NOT NULL,
	"invoice_issuers" text DEFAULT 'BOTH' NOT NULL,
	"cash_rule_ref" text,
	"timezone" text DEFAULT 'Europe/Belgrade' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_settings_payment_term_ck" CHECK ("app"."org_settings"."default_payment_term_days" > 0),
	CONSTRAINT "org_settings_invoice_issuers_ck" CHECK ("app"."org_settings"."invoice_issuers" in ('BOTH', 'DIRECTOR_ONLY')),
	CONSTRAINT "org_settings_timezone_ck" CHECK ("app"."org_settings"."timezone" = 'Europe/Belgrade')
);
--> statement-breakpoint
CREATE TABLE "app"."release_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"gate_key" text NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"evidence_document_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "release_gates_key_uq" UNIQUE("org_id","gate_key"),
	CONSTRAINT "release_gates_key_ck" CHECK ("app"."release_gates"."gate_key" ~ '^(VG|RG)-[0-9]{2}$'),
	CONSTRAINT "release_gates_status_ck" CHECK ("app"."release_gates"."status" in ('NOT_STARTED', 'EVIDENCE_PENDING', 'APPROVED', 'FAILED', 'BLOCKED', 'REVOKED')),
	CONSTRAINT "release_gates_approved_ck" CHECK (("app"."release_gates"."status" = 'APPROVED') = ("app"."release_gates"."approved_by" is not null and "app"."release_gates"."approved_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."document_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"storage_bucket" text NOT NULL,
	"object_path" text NOT NULL,
	"sha256" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"status" text DEFAULT 'QUARANTINE' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_files_sha_uq" UNIQUE("org_id","sha256"),
	CONSTRAINT "document_files_object_uq" UNIQUE("storage_bucket","object_path"),
	CONSTRAINT "document_files_sha_ck" CHECK ("app"."document_files"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "document_files_size_ck" CHECK ("app"."document_files"."size_bytes" > 0),
	CONSTRAINT "document_files_status_ck" CHECK ("app"."document_files"."status" in ('QUARANTINE', 'LINKED', 'ORPHANED'))
);
--> statement-breakpoint
CREATE TABLE "app"."document_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_links_uq" UNIQUE("document_id","entity_type","entity_id","role"),
	CONSTRAINT "document_links_role_ck" CHECK ("app"."document_links"."role" in ('SUPPLIER_INVOICE', 'DUD', 'VERIFICATION_EVIDENCE', 'COUNT_SHEET', 'EXPENSE_EVIDENCE', 'FILING_RECEIPT', 'ADJUSTMENT_EVIDENCE', 'OTHER'))
);
--> statement-breakpoint
CREATE TABLE "app"."customer_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"method" text NOT NULL,
	"result" text NOT NULL,
	"evidence_document_id" uuid,
	"note" text,
	"verified_by" uuid NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" date,
	CONSTRAINT "customer_verifications_method_ck" CHECK ("app"."customer_verifications"."method" in ('FORMAT_CHECK', 'MANUAL_EVIDENCE', 'OFFICIAL_SOURCE', 'SUSPENSION', 'REINSTATEMENT')),
	CONSTRAINT "customer_verifications_result_ck" CHECK ("app"."customer_verifications"."result" in ('PASSED', 'FAILED')),
	CONSTRAINT "customer_verifications_evidence_ck" CHECK ("app"."customer_verifications"."method" <> 'MANUAL_EVIDENCE' or "app"."customer_verifications"."evidence_document_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"identifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"address" text,
	"active" boolean DEFAULT true NOT NULL,
	"related_supplier_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"country" text NOT NULL,
	"identifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"related_customer_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_country_ck" CHECK ("app"."suppliers"."country" in ('XK', 'AL')),
	CONSTRAINT "suppliers_currency_ck" CHECK ("app"."suppliers"."currency" = 'EUR')
);
--> statement-breakpoint
CREATE TABLE "app"."inventory_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"quantity_delta" numeric(18, 3) NOT NULL,
	"reason" text NOT NULL,
	"evidence_document_id" uuid,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_adjustments_kind_ck" CHECK ("app"."inventory_adjustments"."kind" in ('COUNT_CORRECTION', 'DAMAGE_LOSS', 'EXCEPTIONAL_RETURN', 'OPENING_RESOLUTION')),
	CONSTRAINT "inventory_adjustments_status_ck" CHECK ("app"."inventory_adjustments"."status" in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED_POSTED', 'REJECTED')),
	CONSTRAINT "inventory_adjustments_nonzero_ck" CHECK ("app"."inventory_adjustments"."quantity_delta" <> 0),
	CONSTRAINT "inventory_adjustments_reason_ck" CHECK (btrim("app"."inventory_adjustments"."reason") <> ''),
	CONSTRAINT "inventory_adjustments_approved_ck" CHECK ("app"."inventory_adjustments"."status" <> 'APPROVED_POSTED' or "app"."inventory_adjustments"."approval_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."opening_stock_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cutover_plan_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"counted_as_of" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opening_stock_batches_status_ck" CHECK ("app"."opening_stock_batches"."status" in ('DRAFT', 'COUNTED', 'RECONCILED', 'SIGNED_OFF', 'POSTED'))
);
--> statement-breakpoint
CREATE TABLE "app"."opening_stock_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"status" text NOT NULL,
	"quantity" numeric(18, 3),
	"count_evidence" text,
	CONSTRAINT "opening_stock_lines_product_uq" UNIQUE("batch_id","product_id"),
	CONSTRAINT "opening_stock_lines_status_ck" CHECK ("app"."opening_stock_lines"."status" in ('VERIFIED_QTY', 'VERIFIED_ZERO', 'UNKNOWN')),
	CONSTRAINT "opening_stock_lines_qty_ck" CHECK (("app"."opening_stock_lines"."status" = 'VERIFIED_QTY' and "app"."opening_stock_lines"."quantity" > 0)
        or ("app"."opening_stock_lines"."status" = 'VERIFIED_ZERO' and "app"."opening_stock_lines"."quantity" = 0)
        or ("app"."opening_stock_lines"."status" = 'UNKNOWN' and "app"."opening_stock_lines"."quantity" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"barcode" text,
	"reference_purchase_price" numeric(18, 3),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_uq" UNIQUE("org_id","sku"),
	CONSTRAINT "products_sku_ck" CHECK ("app"."products"."sku" <> '' and "app"."products"."sku" = btrim("app"."products"."sku")),
	CONSTRAINT "products_category_ck" CHECK ("app"."products"."category" in ('ALUMINIUM', 'PVC', 'ACCESSORY', 'OTHER')),
	CONSTRAINT "products_unit_ck" CHECK ("app"."products"."unit" in ('KG', 'M2', 'COPE')),
	CONSTRAINT "products_reference_price_ck" CHECK ("app"."products"."reference_purchase_price" is null or "app"."products"."reference_purchase_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."stock_balances" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"on_hand" numeric(18, 3) DEFAULT '0' NOT NULL,
	"last_movement_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_non_negative_ck" CHECK ("app"."stock_balances"."on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."stock_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_date" date NOT NULL,
	"posted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_events_source_uq" UNIQUE("source_type","source_id"),
	CONSTRAINT "stock_events_type_ck" CHECK ("app"."stock_events"."event_type" in ('OPENING', 'PURCHASE_RECEIPT', 'SALE_FULFILLMENT', 'FULFILLMENT_CORRECTION', 'ADJUSTMENT')),
	CONSTRAINT "stock_events_source_ck" CHECK (("app"."stock_events"."event_type", "app"."stock_events"."source_type") in (('OPENING', 'OPENING_STOCK_BATCH'), ('PURCHASE_RECEIPT', 'GOODS_RECEIPT'), ('SALE_FULFILLMENT', 'FULFILLMENT'), ('FULFILLMENT_CORRECTION', 'FULFILLMENT_CORRECTION'), ('ADJUSTMENT', 'INVENTORY_ADJUSTMENT')))
);
--> statement-breakpoint
CREATE TABLE "app"."stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stock_event_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_delta" numeric(18, 3) NOT NULL,
	"unit" text NOT NULL,
	"source_type" text NOT NULL,
	"movement_type" text NOT NULL,
	"source_line_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_source_line_uq" UNIQUE("source_type","source_line_id"),
	CONSTRAINT "stock_movements_nonzero_ck" CHECK ("app"."stock_movements"."quantity_delta" <> 0),
	CONSTRAINT "stock_movements_sign_ck" CHECK (("app"."stock_movements"."movement_type" not in ('OPENING', 'PURCHASE_RECEIPT') or "app"."stock_movements"."quantity_delta" > 0)
        and ("app"."stock_movements"."movement_type" <> 'SALE_FULFILLMENT' or "app"."stock_movements"."quantity_delta" < 0)),
	CONSTRAINT "stock_movements_unit_ck" CHECK ("app"."stock_movements"."unit" in ('KG', 'M2', 'COPE')),
	CONSTRAINT "stock_movements_type_ck" CHECK ("app"."stock_movements"."movement_type" in ('OPENING', 'PURCHASE_RECEIPT', 'SALE_FULFILLMENT', 'FULFILLMENT_CORRECTION', 'ADJUSTMENT'))
);
--> statement-breakpoint
CREATE TABLE "app"."fulfillment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"fulfillment_id" uuid NOT NULL,
	"sale_line_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	CONSTRAINT "fulfillment_lines_sale_line_uq" UNIQUE("sale_line_id"),
	CONSTRAINT "fulfillment_lines_qty_ck" CHECK ("app"."fulfillment_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_date" date NOT NULL,
	"handed_over_by" uuid NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	CONSTRAINT "fulfillments_sale_uq" UNIQUE("sale_id"),
	CONSTRAINT "fulfillments_invoice_uq" UNIQUE("invoice_id"),
	CONSTRAINT "fulfillments_status_ck" CHECK ("app"."fulfillments"."status" = 'POSTED')
);
--> statement-breakpoint
CREATE TABLE "app"."invoice_pdf_renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"render_no" integer NOT NULL,
	"template_version" text NOT NULL,
	"storage_object" text NOT NULL,
	"sha256" text NOT NULL,
	"rendered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_pdf_renders_uq" UNIQUE("invoice_id","render_no"),
	CONSTRAINT "invoice_pdf_renders_sha_ck" CHECK ("app"."invoice_pdf_renders"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."invoice_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"fiscal_year" integer NOT NULL,
	"kind" text NOT NULL,
	"code" text NOT NULL,
	"legacy_last_number" integer,
	"next_number" integer NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_series_uq" UNIQUE("org_id","fiscal_year","kind","code"),
	CONSTRAINT "invoice_series_kind_ck" CHECK ("app"."invoice_series"."kind" in ('SALES_INVOICE', 'CORRECTION_DOCUMENT')),
	CONSTRAINT "invoice_series_status_ck" CHECK ("app"."invoice_series"."status" in ('PROPOSED', 'ACCOUNTANT_APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED')),
	CONSTRAINT "invoice_series_year_ck" CHECK ("app"."invoice_series"."fiscal_year" between 2000 and 2100),
	CONSTRAINT "invoice_series_next_ck" CHECK ("app"."invoice_series"."next_number" >= 1),
	CONSTRAINT "invoice_series_legacy_ck" CHECK ("app"."invoice_series"."legacy_last_number" is null or "app"."invoice_series"."legacy_last_number" >= 0),
	CONSTRAINT "invoice_series_approved_ck" CHECK ("app"."invoice_series"."status" not in ('ACCOUNTANT_APPROVED', 'ACTIVE') or "app"."invoice_series"."approval_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	"unit" text NOT NULL,
	"unit_price_net" numeric(18, 3) NOT NULL,
	CONSTRAINT "sale_lines_line_uq" UNIQUE("sale_id","line_no"),
	CONSTRAINT "sale_lines_product_uq" UNIQUE("sale_id","product_id"),
	CONSTRAINT "sale_lines_line_no_ck" CHECK ("app"."sale_lines"."line_no" > 0),
	CONSTRAINT "sale_lines_qty_ck" CHECK ("app"."sale_lines"."quantity" > 0),
	CONSTRAINT "sale_lines_price_ck" CHECK ("app"."sale_lines"."unit_price_net" >= 0),
	CONSTRAINT "sale_lines_unit_ck" CHECK ("app"."sale_lines"."unit" in ('KG', 'M2', 'COPE'))
);
--> statement-breakpoint
CREATE TABLE "app"."sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"payment_term_days" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "sales_status_ck" CHECK ("app"."sales"."status" in ('DRAFT', 'CONFIRMED', 'DISCARDED')),
	CONSTRAINT "sales_payment_term_ck" CHECK ("app"."sales"."payment_term_days" > 0),
	CONSTRAINT "sales_confirmed_ck" CHECK (("app"."sales"."status" = 'CONFIRMED') = ("app"."sales"."confirmed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."tax_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	"unit_price_net" numeric(18, 3) NOT NULL,
	"line_net" numeric(18, 2) NOT NULL,
	"vat_category" text NOT NULL,
	"vat_rate" numeric(9, 4),
	"line_vat" numeric(18, 2) NOT NULL,
	CONSTRAINT "tax_invoice_lines_uq" UNIQUE("invoice_id","line_no"),
	CONSTRAINT "tax_invoice_lines_qty_ck" CHECK ("app"."tax_invoice_lines"."quantity" > 0),
	CONSTRAINT "tax_invoice_lines_price_ck" CHECK ("app"."tax_invoice_lines"."unit_price_net" >= 0),
	CONSTRAINT "tax_invoice_lines_unit_ck" CHECK ("app"."tax_invoice_lines"."unit" in ('KG', 'M2', 'COPE'))
);
--> statement-breakpoint
CREATE TABLE "app"."tax_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"document_date" date NOT NULL,
	"due_date" date NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" uuid NOT NULL,
	"buyer_snapshot" jsonb NOT NULL,
	"seller_snapshot" jsonb NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"total_net" numeric(18, 2) NOT NULL,
	"total_vat" numeric(18, 2) NOT NULL,
	"total_gross" numeric(18, 2) NOT NULL,
	"tax_snapshot_id" uuid NOT NULL,
	"legal_template_version" text NOT NULL,
	CONSTRAINT "tax_invoices_sale_uq" UNIQUE("sale_id"),
	CONSTRAINT "tax_invoices_number_uq" UNIQUE("series_id","number"),
	CONSTRAINT "tax_invoices_number_ck" CHECK ("app"."tax_invoices"."number" > 0),
	CONSTRAINT "tax_invoices_due_ck" CHECK ("app"."tax_invoices"."due_date" >= "app"."tax_invoices"."document_date"),
	CONSTRAINT "tax_invoices_totals_ck" CHECK ("app"."tax_invoices"."total_gross" = "app"."tax_invoices"."total_net" + "app"."tax_invoices"."total_vat"),
	CONSTRAINT "tax_invoices_currency_ck" CHECK ("app"."tax_invoices"."currency" = 'EUR')
);
--> statement-breakpoint
CREATE TABLE "app"."correction_document_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"correction_id" uuid NOT NULL,
	"original_invoice_line_id" uuid,
	"quantity_delta" numeric(18, 3),
	"price_delta" numeric(18, 3),
	"net_delta" numeric(18, 2) NOT NULL,
	"vat_delta" numeric(18, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."correction_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"original_invoice_id" uuid NOT NULL,
	"series_id" uuid,
	"number" integer,
	"reason_code" text NOT NULL,
	"reason_comment" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_net" numeric(18, 2),
	"total_vat" numeric(18, 2),
	"total_gross" numeric(18, 2),
	"tax_snapshot_id" uuid,
	"target_period_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" uuid,
	"issued_at" timestamp with time zone,
	CONSTRAINT "correction_documents_number_uq" UNIQUE("series_id","number"),
	CONSTRAINT "correction_documents_kind_ck" CHECK ("app"."correction_documents"."kind" in ('CREDIT', 'DEBIT', 'CORRECTION')),
	CONSTRAINT "correction_documents_reason_ck" CHECK ("app"."correction_documents"."reason_code" in ('QTY_WRONG', 'PRICE_WRONG', 'BUYER_DATA', 'OTHER')),
	CONSTRAINT "correction_documents_status_ck" CHECK ("app"."correction_documents"."status" in ('DRAFT', 'PENDING_ACCOUNTANT_REVIEW', 'ACCOUNTANT_APPROVED', 'ISSUED', 'DISCARDED')),
	CONSTRAINT "correction_documents_other_reason_ck" CHECK ("app"."correction_documents"."reason_code" <> 'OTHER' or btrim(coalesce("app"."correction_documents"."reason_comment", '')) <> ''),
	CONSTRAINT "correction_documents_issued_ck" CHECK ("app"."correction_documents"."status" <> 'ISSUED' or ("app"."correction_documents"."series_id" is not null and "app"."correction_documents"."number" is not null
        and "app"."correction_documents"."issued_at" is not null and "app"."correction_documents"."issued_by" is not null and "app"."correction_documents"."tax_snapshot_id" is not null
        and "app"."correction_documents"."total_gross" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."fulfillment_correction_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"fulfillment_correction_id" uuid NOT NULL,
	"fulfillment_line_id" uuid NOT NULL,
	"quantity_delta" numeric(18, 3) NOT NULL,
	CONSTRAINT "fulfillment_correction_lines_uq" UNIQUE("fulfillment_correction_id","fulfillment_line_id"),
	CONSTRAINT "fulfillment_correction_lines_nonzero_ck" CHECK ("app"."fulfillment_correction_lines"."quantity_delta" <> 0)
);
--> statement-breakpoint
CREATE TABLE "app"."fulfillment_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"fulfillment_id" uuid NOT NULL,
	"linked_correction_document_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_corrections_status_ck" CHECK ("app"."fulfillment_corrections"."status" in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED_POSTED', 'REJECTED')),
	CONSTRAINT "fulfillment_corrections_reason_ck" CHECK (btrim("app"."fulfillment_corrections"."reason") <> ''),
	CONSTRAINT "fulfillment_corrections_approved_ck" CHECK ("app"."fulfillment_corrections"."status" <> 'APPROVED_POSTED' or "app"."fulfillment_corrections"."approval_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."goods_receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"received_quantity" numeric(18, 3) NOT NULL,
	"expected_quantity" numeric(18, 3),
	"purchase_invoice_line_id" uuid,
	"discrepancy_note" text,
	CONSTRAINT "goods_receipt_lines_qty_ck" CHECK ("app"."goods_receipt_lines"."received_quantity" > 0),
	CONSTRAINT "goods_receipt_lines_expected_ck" CHECK ("app"."goods_receipt_lines"."expected_quantity" is null or "app"."goods_receipt_lines"."expected_quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"document_date" date NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"covered_by_opening_count" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"posted_by" uuid,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goods_receipts_status_ck" CHECK ("app"."goods_receipts"."status" in ('DRAFT', 'DISCREPANCY_HOLD', 'POSTED', 'REJECTED')),
	CONSTRAINT "goods_receipts_posted_ck" CHECK (("app"."goods_receipts"."status" = 'POSTED') = ("app"."goods_receipts"."posted_at" is not null and "app"."goods_receipts"."posted_by" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."import_declaration_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"import_declaration_id" uuid NOT NULL,
	"purchase_invoice_id" uuid,
	"goods_receipt_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_declaration_links_invoice_uq" UNIQUE NULLS NOT DISTINCT("import_declaration_id","purchase_invoice_id"),
	CONSTRAINT "import_declaration_links_receipt_uq" UNIQUE NULLS NOT DISTINCT("import_declaration_id","goods_receipt_id"),
	CONSTRAINT "import_declaration_links_target_ck" CHECK (num_nonnulls("app"."import_declaration_links"."purchase_invoice_id", "app"."import_declaration_links"."goods_receipt_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "app"."import_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customs_reference" text NOT NULL,
	"declaration_date" date NOT NULL,
	"broker_supplier_id" uuid,
	"customs_value" numeric(18, 2),
	"customs_amounts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"import_vat_amount" numeric(18, 2),
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"tax_classification_status" text DEFAULT 'UNCLASSIFIED' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_declarations_reference_uq" UNIQUE("org_id","customs_reference"),
	CONSTRAINT "import_declarations_status_ck" CHECK ("app"."import_declarations"."status" in ('DRAFT', 'REGISTERED')),
	CONSTRAINT "import_declarations_tax_ck" CHECK ("app"."import_declarations"."tax_classification_status" in ('UNCLASSIFIED', 'PROPOSED', 'ACCOUNTANT_APPROVED', 'RECLASSIFICATION_PENDING'))
);
--> statement-breakpoint
CREATE TABLE "app"."purchase_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(18, 3) NOT NULL,
	"unit_price_net" numeric(18, 3) NOT NULL,
	"line_net" numeric(18, 2) NOT NULL,
	CONSTRAINT "purchase_invoice_lines_uq" UNIQUE("invoice_id","line_no"),
	CONSTRAINT "purchase_invoice_lines_qty_ck" CHECK ("app"."purchase_invoice_lines"."quantity" > 0),
	CONSTRAINT "purchase_invoice_lines_price_ck" CHECK ("app"."purchase_invoice_lines"."unit_price_net" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."purchase_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_invoice_number" text NOT NULL,
	"normalized_number" text NOT NULL,
	"invoice_date" date NOT NULL,
	"received_doc_date" date,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"total_net" numeric(18, 2),
	"total_vat" numeric(18, 2),
	"total_gross" numeric(18, 2),
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"tax_classification_status" text DEFAULT 'UNCLASSIFIED' NOT NULL,
	"pre_cutover" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_invoices_number_uq" UNIQUE("supplier_id","normalized_number"),
	CONSTRAINT "purchase_invoices_status_ck" CHECK ("app"."purchase_invoices"."status" in ('DRAFT', 'REGISTERED')),
	CONSTRAINT "purchase_invoices_tax_ck" CHECK ("app"."purchase_invoices"."tax_classification_status" in ('UNCLASSIFIED', 'PROPOSED', 'ACCOUNTANT_APPROVED', 'RECLASSIFICATION_PENDING')),
	CONSTRAINT "purchase_invoices_currency_ck" CHECK ("app"."purchase_invoices"."currency" = 'EUR'),
	CONSTRAINT "purchase_invoices_totals_ck" CHECK ("app"."purchase_invoices"."total_gross" is null or "app"."purchase_invoices"."total_gross" = "app"."purchase_invoices"."total_net" + "app"."purchase_invoices"."total_vat")
);
--> statement-breakpoint
CREATE TABLE "app"."expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid,
	"vendor_name" text,
	"reference" text NOT NULL,
	"normalized_reference" text NOT NULL,
	"document_date" date NOT NULL,
	"category" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"net_amount" numeric(18, 2) NOT NULL,
	"vat_amount" numeric(18, 2) NOT NULL,
	"gross_amount" numeric(18, 2) NOT NULL,
	"tax_classification_status" text DEFAULT 'UNCLASSIFIED' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"corrects_expense_id" uuid,
	"created_by" uuid NOT NULL,
	"posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_vendor_ck" CHECK (num_nonnulls("app"."expenses"."supplier_id", nullif(btrim(coalesce("app"."expenses"."vendor_name", '')), '')) = 1),
	CONSTRAINT "expenses_category_ck" CHECK ("app"."expenses"."category" in ('RENT', 'ELECTRICITY', 'TRANSPORT', 'SERVICES', 'OTHER')),
	CONSTRAINT "expenses_status_ck" CHECK ("app"."expenses"."status" in ('DRAFT', 'POSTED')),
	CONSTRAINT "expenses_tax_ck" CHECK ("app"."expenses"."tax_classification_status" in ('UNCLASSIFIED', 'PROPOSED', 'ACCOUNTANT_APPROVED', 'RECLASSIFICATION_PENDING')),
	CONSTRAINT "expenses_currency_ck" CHECK ("app"."expenses"."currency" = 'EUR'),
	CONSTRAINT "expenses_totals_ck" CHECK ("app"."expenses"."gross_amount" = "app"."expenses"."net_amount" + "app"."expenses"."vat_amount"),
	CONSTRAINT "expenses_posted_ck" CHECK (("app"."expenses"."status" = 'POSTED') = ("app"."expenses"."posted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."customer_refund_liabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_refund_liabilities_source_uq" UNIQUE("source_type","source_id"),
	CONSTRAINT "customer_refund_liabilities_source_ck" CHECK ("app"."customer_refund_liabilities"."source_type" in ('PAYMENT_OVERPAYMENT', 'CREDIT_AFTER_SETTLEMENT')),
	CONSTRAINT "customer_refund_liabilities_currency_ck" CHECK ("app"."customer_refund_liabilities"."currency" = 'EUR'),
	CONSTRAINT "customer_refund_liabilities_amount_ck" CHECK ("app"."customer_refund_liabilities"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"tax_invoice_id" uuid,
	"correction_document_id" uuid,
	"purchase_invoice_id" uuid,
	"expense_id" uuid,
	"historical_obligation_id" uuid,
	"amount" numeric(18, 2) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocations_one_target_ck" CHECK (num_nonnulls("app"."payment_allocations"."tax_invoice_id", "app"."payment_allocations"."correction_document_id", "app"."payment_allocations"."purchase_invoice_id", "app"."payment_allocations"."expense_id", "app"."payment_allocations"."historical_obligation_id") = 1),
	CONSTRAINT "payment_allocations_amount_ck" CHECK ("app"."payment_allocations"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."payment_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reversals_payment_uq" UNIQUE("payment_id"),
	CONSTRAINT "payment_reversals_status_ck" CHECK ("app"."payment_reversals"."status" in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED_POSTED', 'REJECTED')),
	CONSTRAINT "payment_reversals_reason_ck" CHECK (btrim("app"."payment_reversals"."reason") <> ''),
	CONSTRAINT "payment_reversals_approved_ck" CHECK ("app"."payment_reversals"."status" <> 'APPROVED_POSTED' or "app"."payment_reversals"."approval_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"customer_id" uuid,
	"supplier_id" uuid,
	"method" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"bank_reference" text,
	"cash_rule_check" jsonb,
	"accountant_confirmation_required" boolean DEFAULT false NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_direction_ck" CHECK ("app"."payments"."direction" in ('IN', 'OUT')),
	CONSTRAINT "payments_method_ck" CHECK ("app"."payments"."method" in ('CASH', 'BANK')),
	CONSTRAINT "payments_currency_ck" CHECK ("app"."payments"."currency" = 'EUR'),
	CONSTRAINT "payments_amount_ck" CHECK ("app"."payments"."amount" > 0),
	CONSTRAINT "payments_party_ck" CHECK (num_nonnulls("app"."payments"."customer_id", "app"."payments"."supplier_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "app"."refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"liability_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_payment_uq" UNIQUE("payment_id"),
	CONSTRAINT "refunds_amount_ck" CHECK ("app"."refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."historical_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"customer_id" uuid,
	"supplier_id" uuid,
	"party_id" uuid GENERATED ALWAYS AS (coalesce(customer_id, supplier_id)) STORED NOT NULL,
	"original_series" text,
	"original_number" text NOT NULL,
	"normalized_identity" text NOT NULL,
	"original_issue_date" date NOT NULL,
	"original_total" numeric(18, 2),
	"open_balance_at_import" numeric(18, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"batch_id" uuid NOT NULL,
	"status" text DEFAULT 'STAGED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_obligations_identity_uq" UNIQUE("direction","party_id","normalized_identity"),
	CONSTRAINT "historical_obligations_direction_ck" CHECK ("app"."historical_obligations"."direction" in ('RECEIVABLE', 'PAYABLE')),
	CONSTRAINT "historical_obligations_status_ck" CHECK ("app"."historical_obligations"."status" in ('STAGED', 'APPROVED', 'REJECTED')),
	CONSTRAINT "historical_obligations_currency_ck" CHECK ("app"."historical_obligations"."currency" = 'EUR'),
	CONSTRAINT "historical_obligations_party_ck" CHECK (("app"."historical_obligations"."direction" = 'RECEIVABLE' and "app"."historical_obligations"."customer_id" is not null and "app"."historical_obligations"."supplier_id" is null)
        or ("app"."historical_obligations"."direction" = 'PAYABLE' and "app"."historical_obligations"."supplier_id" is not null and "app"."historical_obligations"."customer_id" is null)),
	CONSTRAINT "historical_obligations_balance_ck" CHECK ("app"."historical_obligations"."open_balance_at_import" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" text DEFAULT 'UPLOADED' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_file_uq" UNIQUE("org_id","kind","file_sha256"),
	CONSTRAINT "import_batches_kind_ck" CHECK ("app"."import_batches"."kind" in ('PRODUCTS', 'OPENING_STOCK', 'HISTORICAL_RECEIVABLES', 'HISTORICAL_PAYABLES')),
	CONSTRAINT "import_batches_status_ck" CHECK ("app"."import_batches"."status" in ('UPLOADED', 'VALIDATED', 'HAS_ERRORS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
	CONSTRAINT "import_batches_sha_ck" CHECK ("app"."import_batches"."file_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "import_batches_counts_ck" CHECK ("app"."import_batches"."row_count" >= 0 and "app"."import_batches"."error_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."atk_template_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"url" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"file_sha256" text NOT NULL,
	"version_label" text NOT NULL,
	"mapping_doc" text NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atk_template_provenance_sha_ck" CHECK ("app"."atk_template_provenance"."file_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."book_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"book" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"line_version" integer DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_lines_source_uq" UNIQUE("book","source_type","source_id","line_version"),
	CONSTRAINT "book_lines_book_ck" CHECK ("app"."book_lines"."book" in ('LB', 'LSH')),
	CONSTRAINT "book_lines_source_ck" CHECK ("app"."book_lines"."source_type" in ('TAX_INVOICE', 'CORRECTION_DOCUMENT', 'PURCHASE_INVOICE', 'IMPORT_DECLARATION', 'EXPENSE')),
	CONSTRAINT "book_lines_book_source_ck" CHECK (("app"."book_lines"."book" = 'LSH' and "app"."book_lines"."source_type" in ('TAX_INVOICE', 'CORRECTION_DOCUMENT'))
        or ("app"."book_lines"."book" = 'LB' and "app"."book_lines"."source_type" in ('PURCHASE_INVOICE', 'IMPORT_DECLARATION', 'EXPENSE', 'CORRECTION_DOCUMENT')))
);
--> statement-breakpoint
CREATE TABLE "app"."edi_filing_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"filing_kind" text NOT NULL,
	"filed_on" date NOT NULL,
	"receipt_reference" text NOT NULL,
	"evidence_document_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edi_filing_receipts_uq" UNIQUE("period_id","filing_kind")
);
--> statement-breakpoint
CREATE TABLE "app"."exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"period_snapshot_hash" text NOT NULL,
	"template_provenance_id" uuid,
	"file_sha256" text NOT NULL,
	"generated_by" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exports_kind_ck" CHECK ("app"."exports"."kind" in ('INTERNAL_PREVIEW', 'OFFICIAL')),
	CONSTRAINT "exports_official_ck" CHECK ("app"."exports"."kind" = 'INTERNAL_PREVIEW' or "app"."exports"."template_provenance_id" is not null),
	CONSTRAINT "exports_sha_ck" CHECK ("app"."exports"."file_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."tax_period_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content_hash" text NOT NULL,
	"totals" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_period_snapshots_kind_ck" CHECK ("app"."tax_period_snapshots"."kind" in ('READY', 'ACCOUNTANT_REVIEW', 'DIRECTOR_APPROVAL', 'CLOSE', 'AMENDMENT')),
	CONSTRAINT "tax_period_snapshots_hash_ck" CHECK ("app"."tax_period_snapshots"."content_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."tax_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"period_month" date NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"current_snapshot_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_periods_month_uq" UNIQUE("org_id","period_month"),
	CONSTRAINT "tax_periods_status_ck" CHECK ("app"."tax_periods"."status" in ('OPEN', 'READY_FOR_ACCOUNTANT_REVIEW', 'ACCOUNTANT_REVIEWED', 'DIRECTOR_APPROVED', 'CLOSED', 'AMENDMENT_OPEN')),
	CONSTRAINT "tax_periods_first_day_ck" CHECK ("app"."tax_periods"."period_month" = date_trunc('month', "app"."tax_periods"."period_month")::date)
);
--> statement-breakpoint
CREATE TABLE "app"."tax_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rule_ids" uuid[] NOT NULL,
	"rule_values" jsonb NOT NULL,
	"rounding_policy_version" text NOT NULL,
	"computation_trace" jsonb NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_snapshots_hash_ck" CHECK ("app"."tax_snapshots"."hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."vat_rule_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approval_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vat_rule_sets_status_ck" CHECK ("app"."vat_rule_sets"."status" in ('DRAFT', 'ACCOUNTANT_APPROVED', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "vat_rule_sets_approved_ck" CHECK ("app"."vat_rule_sets"."status" = 'DRAFT' or "app"."vat_rule_sets"."approval_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "app"."vat_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rule_set_id" uuid NOT NULL,
	"category_code" text NOT NULL,
	"applies_to" text NOT NULL,
	"rate" numeric(9, 4),
	"treatment" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vat_rules_applies_to_ck" CHECK ("app"."vat_rules"."applies_to" in ('SALE', 'PURCHASE', 'IMPORT', 'EXPENSE')),
	CONSTRAINT "vat_rules_status_ck" CHECK ("app"."vat_rules"."status" in ('DRAFT', 'ACCOUNTANT_APPROVED', 'ACTIVE', 'SUPERSEDED')),
	CONSTRAINT "vat_rules_rate_ck" CHECK ("app"."vat_rules"."rate" is null or "app"."vat_rules"."rate" >= 0),
	CONSTRAINT "vat_rules_range_ck" CHECK ("app"."vat_rules"."effective_to" is null or "app"."vat_rules"."effective_to" > "app"."vat_rules"."effective_from")
);
--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."approvals" ADD CONSTRAINT "approvals_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."settlement_targets" ADD CONSTRAINT "settlement_targets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_roles" ADD CONSTRAINT "user_roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD CONSTRAINT "cutover_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD CONSTRAINT "cutover_plans_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."org_legal_identity_versions" ADD CONSTRAINT "org_legal_identity_versions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."org_legal_identity_versions" ADD CONSTRAINT "org_legal_identity_versions_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."org_legal_identity_versions" ADD CONSTRAINT "org_legal_identity_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."org_settings" ADD CONSTRAINT "org_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."release_gates" ADD CONSTRAINT "release_gates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."release_gates" ADD CONSTRAINT "release_gates_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_files" ADD CONSTRAINT "document_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_files" ADD CONSTRAINT "document_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_links" ADD CONSTRAINT "document_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_links" ADD CONSTRAINT "document_links_document_id_document_files_id_fk" FOREIGN KEY ("document_id") REFERENCES "app"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."document_links" ADD CONSTRAINT "document_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_evidence_fk" FOREIGN KEY ("evidence_document_id") REFERENCES "app"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_related_supplier_id_suppliers_id_fk" FOREIGN KEY ("related_supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_related_customer_id_customers_id_fk" FOREIGN KEY ("related_customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_evidence_document_id_document_files_id_fk" FOREIGN KEY ("evidence_document_id") REFERENCES "app"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_cutover_plan_id_cutover_plans_id_fk" FOREIGN KEY ("cutover_plan_id") REFERENCES "app"."cutover_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_batch_id_opening_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "app"."opening_stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."products" ADD CONSTRAINT "products_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_balances" ADD CONSTRAINT "stock_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_balances" ADD CONSTRAINT "stock_balances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_balances" ADD CONSTRAINT "stock_balances_last_movement_id_stock_movements_id_fk" FOREIGN KEY ("last_movement_id") REFERENCES "app"."stock_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_events" ADD CONSTRAINT "stock_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_events" ADD CONSTRAINT "stock_events_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_movements" ADD CONSTRAINT "stock_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_movements" ADD CONSTRAINT "stock_movements_stock_event_id_stock_events_id_fk" FOREIGN KEY ("stock_event_id") REFERENCES "app"."stock_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "app"."fulfillments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_sale_line_id_sale_lines_id_fk" FOREIGN KEY ("sale_line_id") REFERENCES "app"."sale_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillments" ADD CONSTRAINT "fulfillments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillments" ADD CONSTRAINT "fulfillments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "app"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillments" ADD CONSTRAINT "fulfillments_invoice_id_tax_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "app"."tax_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillments" ADD CONSTRAINT "fulfillments_handed_over_by_users_id_fk" FOREIGN KEY ("handed_over_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_pdf_renders" ADD CONSTRAINT "invoice_pdf_renders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_pdf_renders" ADD CONSTRAINT "invoice_pdf_renders_invoice_id_tax_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "app"."tax_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD CONSTRAINT "invoice_series_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD CONSTRAINT "invoice_series_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sale_lines" ADD CONSTRAINT "sale_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "app"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sale_lines" ADD CONSTRAINT "sale_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sales" ADD CONSTRAINT "sales_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sales" ADD CONSTRAINT "sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoice_lines" ADD CONSTRAINT "tax_invoice_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoice_lines" ADD CONSTRAINT "tax_invoice_lines_invoice_id_tax_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "app"."tax_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoice_lines" ADD CONSTRAINT "tax_invoice_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoices" ADD CONSTRAINT "tax_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoices" ADD CONSTRAINT "tax_invoices_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "app"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoices" ADD CONSTRAINT "tax_invoices_series_id_invoice_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "app"."invoice_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoices" ADD CONSTRAINT "tax_invoices_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_invoices" ADD CONSTRAINT "tax_invoices_tax_snapshot_id_tax_snapshots_id_fk" FOREIGN KEY ("tax_snapshot_id") REFERENCES "app"."tax_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_document_lines" ADD CONSTRAINT "correction_document_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_document_lines" ADD CONSTRAINT "correction_document_lines_correction_fk" FOREIGN KEY ("correction_id") REFERENCES "app"."correction_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_document_lines" ADD CONSTRAINT "correction_document_lines_invoice_line_fk" FOREIGN KEY ("original_invoice_line_id") REFERENCES "app"."tax_invoice_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_original_invoice_id_tax_invoices_id_fk" FOREIGN KEY ("original_invoice_id") REFERENCES "app"."tax_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_series_id_invoice_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "app"."invoice_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_tax_snapshot_id_tax_snapshots_id_fk" FOREIGN KEY ("tax_snapshot_id") REFERENCES "app"."tax_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_target_period_id_tax_periods_id_fk" FOREIGN KEY ("target_period_id") REFERENCES "app"."tax_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."correction_documents" ADD CONSTRAINT "correction_documents_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_correction_lines" ADD CONSTRAINT "fulfillment_correction_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_correction_lines" ADD CONSTRAINT "fulfillment_correction_lines_correction_fk" FOREIGN KEY ("fulfillment_correction_id") REFERENCES "app"."fulfillment_corrections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_correction_lines" ADD CONSTRAINT "fulfillment_correction_lines_line_fk" FOREIGN KEY ("fulfillment_line_id") REFERENCES "app"."fulfillment_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_corrections" ADD CONSTRAINT "fulfillment_corrections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_corrections" ADD CONSTRAINT "fulfillment_corrections_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "app"."fulfillments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_corrections" ADD CONSTRAINT "fulfillment_corrections_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_corrections" ADD CONSTRAINT "fulfillment_corrections_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."fulfillment_corrections" ADD CONSTRAINT "fulfillment_corrections_correction_document_fk" FOREIGN KEY ("linked_correction_document_id") REFERENCES "app"."correction_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "app"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_invoice_line_fk" FOREIGN KEY ("purchase_invoice_line_id") REFERENCES "app"."purchase_invoice_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipts" ADD CONSTRAINT "goods_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."goods_receipts" ADD CONSTRAINT "goods_receipts_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declaration_links" ADD CONSTRAINT "import_declaration_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declaration_links" ADD CONSTRAINT "import_declaration_links_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "app"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declaration_links" ADD CONSTRAINT "import_declaration_links_declaration_fk" FOREIGN KEY ("import_declaration_id") REFERENCES "app"."import_declarations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declaration_links" ADD CONSTRAINT "import_declaration_links_invoice_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "app"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declarations" ADD CONSTRAINT "import_declarations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declarations" ADD CONSTRAINT "import_declarations_broker_supplier_id_suppliers_id_fk" FOREIGN KEY ("broker_supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_declarations" ADD CONSTRAINT "import_declarations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "app"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."expenses" ADD CONSTRAINT "expenses_corrects_expense_id_expenses_id_fk" FOREIGN KEY ("corrects_expense_id") REFERENCES "app"."expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_refund_liabilities" ADD CONSTRAINT "customer_refund_liabilities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_refund_liabilities" ADD CONSTRAINT "customer_refund_liabilities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_refund_liabilities" ADD CONSTRAINT "customer_refund_liabilities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_tax_invoice_id_tax_invoices_id_fk" FOREIGN KEY ("tax_invoice_id") REFERENCES "app"."tax_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_purchase_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("purchase_invoice_id") REFERENCES "app"."purchase_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "app"."expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_correction_fk" FOREIGN KEY ("correction_document_id") REFERENCES "app"."correction_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_allocations" ADD CONSTRAINT "payment_allocations_historical_fk" FOREIGN KEY ("historical_obligation_id") REFERENCES "app"."historical_obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_reversals" ADD CONSTRAINT "payment_reversals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_reversals" ADD CONSTRAINT "payment_reversals_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_reversals" ADD CONSTRAINT "payment_reversals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_reversals" ADD CONSTRAINT "payment_reversals_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_liability_id_customer_refund_liabilities_id_fk" FOREIGN KEY ("liability_id") REFERENCES "app"."customer_refund_liabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "app"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."historical_obligations" ADD CONSTRAINT "historical_obligations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."historical_obligations" ADD CONSTRAINT "historical_obligations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "app"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."historical_obligations" ADD CONSTRAINT "historical_obligations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "app"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."historical_obligations" ADD CONSTRAINT "historical_obligations_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "app"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."atk_template_provenance" ADD CONSTRAINT "atk_template_provenance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."atk_template_provenance" ADD CONSTRAINT "atk_template_provenance_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."book_lines" ADD CONSTRAINT "book_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."book_lines" ADD CONSTRAINT "book_lines_period_id_tax_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app"."tax_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."edi_filing_receipts" ADD CONSTRAINT "edi_filing_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."edi_filing_receipts" ADD CONSTRAINT "edi_filing_receipts_period_id_tax_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app"."tax_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."edi_filing_receipts" ADD CONSTRAINT "edi_filing_receipts_evidence_document_id_document_files_id_fk" FOREIGN KEY ("evidence_document_id") REFERENCES "app"."document_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."edi_filing_receipts" ADD CONSTRAINT "edi_filing_receipts_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exports" ADD CONSTRAINT "exports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exports" ADD CONSTRAINT "exports_period_id_tax_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app"."tax_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exports" ADD CONSTRAINT "exports_template_provenance_id_atk_template_provenance_id_fk" FOREIGN KEY ("template_provenance_id") REFERENCES "app"."atk_template_provenance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exports" ADD CONSTRAINT "exports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_period_snapshots" ADD CONSTRAINT "tax_period_snapshots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_period_snapshots" ADD CONSTRAINT "tax_period_snapshots_period_id_tax_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "app"."tax_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_period_snapshots" ADD CONSTRAINT "tax_period_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_periods" ADD CONSTRAINT "tax_periods_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_periods" ADD CONSTRAINT "tax_periods_current_snapshot_id_tax_period_snapshots_id_fk" FOREIGN KEY ("current_snapshot_id") REFERENCES "app"."tax_period_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."tax_snapshots" ADD CONSTRAINT "tax_snapshots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vat_rule_sets" ADD CONSTRAINT "vat_rule_sets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vat_rule_sets" ADD CONSTRAINT "vat_rule_sets_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vat_rule_sets" ADD CONSTRAINT "vat_rule_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vat_rules" ADD CONSTRAINT "vat_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."vat_rules" ADD CONSTRAINT "vat_rules_rule_set_id_vat_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "app"."vat_rule_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_subject_idx" ON "app"."approvals" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "app"."audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_idx" ON "app"."audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cutover_plans_one_active_uq" ON "app"."cutover_plans" USING btree ("org_id") WHERE "app"."cutover_plans"."status" in ('DRAFT', 'LOCKED');--> statement-breakpoint
CREATE UNIQUE INDEX "org_legal_identity_versions_one_approved_uq" ON "app"."org_legal_identity_versions" USING btree ("org_id") WHERE "app"."org_legal_identity_versions"."status" = 'APPROVED';--> statement-breakpoint
CREATE INDEX "document_links_entity_idx" ON "app"."document_links" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "customer_verifications_customer_idx" ON "app"."customer_verifications" USING btree ("customer_id","verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opening_stock_batches_one_posted_uq" ON "app"."opening_stock_batches" USING btree ("org_id") WHERE "app"."opening_stock_batches"."status" = 'POSTED';--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_one_opening_uq" ON "app"."stock_movements" USING btree ("product_id") WHERE "app"."stock_movements"."movement_type" = 'OPENING';--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "app"."stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_event_idx" ON "app"."stock_movements" USING btree ("stock_event_id");--> statement-breakpoint
CREATE INDEX "fulfillment_lines_fulfillment_idx" ON "app"."fulfillment_lines" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_series_one_active_uq" ON "app"."invoice_series" USING btree ("org_id","fiscal_year","kind") WHERE "app"."invoice_series"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "correction_document_lines_correction_idx" ON "app"."correction_document_lines" USING btree ("correction_id");--> statement-breakpoint
CREATE INDEX "correction_documents_original_idx" ON "app"."correction_documents" USING btree ("original_invoice_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_lines_receipt_idx" ON "app"."goods_receipt_lines" USING btree ("receipt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_supplier_reference_uq" ON "app"."expenses" USING btree ("supplier_id","normalized_reference") WHERE "app"."expenses"."supplier_id" is not null and "app"."expenses"."corrects_expense_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_vendor_reference_uq" ON "app"."expenses" USING btree ("org_id",lower("vendor_name"),"normalized_reference") WHERE "app"."expenses"."supplier_id" is null and "app"."expenses"."corrects_expense_id" is null;--> statement-breakpoint
CREATE INDEX "payment_allocations_payment_idx" ON "app"."payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_allocations_invoice_idx" ON "app"."payment_allocations" USING btree ("tax_invoice_id");--> statement-breakpoint
CREATE INDEX "payments_customer_idx" ON "app"."payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_supplier_idx" ON "app"."payments" USING btree ("supplier_id");