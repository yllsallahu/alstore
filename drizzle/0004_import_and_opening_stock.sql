CREATE TABLE "app"."import_batch_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_no" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"status" text NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parsed" jsonb,
	"product_id" uuid,
	"included" boolean DEFAULT false NOT NULL,
	CONSTRAINT "import_batch_rows_no_uq" UNIQUE("batch_id","row_no"),
	CONSTRAINT "import_batch_rows_status_ck" CHECK ("app"."import_batch_rows"."status" in ('VALID', 'WARNING', 'ERROR')),
	CONSTRAINT "import_batch_rows_no_ck" CHECK ("app"."import_batch_rows"."row_no" >= 1)
);
--> statement-breakpoint
ALTER TABLE "app"."import_batches" DROP CONSTRAINT "import_batches_counts_ck";--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD COLUMN "mid_month_acknowledged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "counted_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "counted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "reconciliation_note" text;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "reconciled_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "reconciliation_approval_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "lines_hash" text;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "signed_off_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "signed_off_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "signoff_approval_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "unknown_acknowledged_count" integer;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD COLUMN "posted_stock_event_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD COLUMN "proposed_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "file_format" text DEFAULT 'CSV' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "file_size_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "valid_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "warning_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "headers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "preview_hash" text;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "target_opening_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "approval_mode" text;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "approved_row_count" integer;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "decided_by" uuid;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD COLUMN "decision_note" text;--> statement-breakpoint
ALTER TABLE "app"."import_batch_rows" ADD CONSTRAINT "import_batch_rows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "app"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batch_rows" ADD CONSTRAINT "import_batch_rows_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_rows_batch_status_idx" ON "app"."import_batch_rows" USING btree ("batch_id","status");--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD CONSTRAINT "cutover_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_counted_by_users_id_fk" FOREIGN KEY ("counted_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_reconciled_by_users_id_fk" FOREIGN KEY ("reconciled_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_reconciliation_approval_id_approvals_id_fk" FOREIGN KEY ("reconciliation_approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_signed_off_by_users_id_fk" FOREIGN KEY ("signed_off_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_signoff_approval_id_approvals_id_fk" FOREIGN KEY ("signoff_approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_posted_stock_event_id_stock_events_id_fk" FOREIGN KEY ("posted_stock_event_id") REFERENCES "app"."stock_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."invoice_series" ADD CONSTRAINT "invoice_series_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_target_opening_batch_id_opening_stock_batches_id_fk" FOREIGN KEY ("target_opening_batch_id") REFERENCES "app"."opening_stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_plan_uq" UNIQUE("cutover_plan_id");--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD CONSTRAINT "cutover_plans_instant_ck" CHECK ("app"."cutover_plans"."cutover_instant" is null
        or "app"."cutover_plans"."cutover_instant" = ("app"."cutover_plans"."planned_cutover_date"::timestamp at time zone 'Europe/Belgrade'));--> statement-breakpoint
ALTER TABLE "app"."cutover_plans" ADD CONSTRAINT "cutover_plans_mid_month_ck" CHECK ("app"."cutover_plans"."mid_month_acknowledged" or extract(day from "app"."cutover_plans"."planned_cutover_date") = 1);--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_lines_hash_ck" CHECK ("app"."opening_stock_batches"."lines_hash" is null or "app"."opening_stock_batches"."lines_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_counted_ck" CHECK (("app"."opening_stock_batches"."status" in ('DRAFT')) = ("app"."opening_stock_batches"."counted_by" is null and "app"."opening_stock_batches"."counted_at" is null));--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_reconciled_ck" CHECK (("app"."opening_stock_batches"."status" in ('RECONCILED', 'SIGNED_OFF', 'POSTED')) = (
        "app"."opening_stock_batches"."reconciled_by" is not null and "app"."opening_stock_batches"."reconciled_at" is not null
        and "app"."opening_stock_batches"."reconciliation_approval_id" is not null and "app"."opening_stock_batches"."lines_hash" is not null
        and btrim(coalesce("app"."opening_stock_batches"."reconciliation_note", '')) <> ''));--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_signed_ck" CHECK (("app"."opening_stock_batches"."status" in ('SIGNED_OFF', 'POSTED')) = (
        "app"."opening_stock_batches"."signed_off_by" is not null and "app"."opening_stock_batches"."signed_off_at" is not null
        and "app"."opening_stock_batches"."signoff_approval_id" is not null and "app"."opening_stock_batches"."unknown_acknowledged_count" is not null));--> statement-breakpoint
ALTER TABLE "app"."opening_stock_batches" ADD CONSTRAINT "opening_stock_batches_posted_ck" CHECK (("app"."opening_stock_batches"."status" = 'POSTED') = ("app"."opening_stock_batches"."posted_at" is not null and "app"."opening_stock_batches"."posted_stock_event_id" is not null));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_format_ck" CHECK ("app"."import_batches"."file_format" in ('CSV', 'XLSX'));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_preview_hash_ck" CHECK ("app"."import_batches"."preview_hash" is null or "app"."import_batches"."preview_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_approval_mode_ck" CHECK ("app"."import_batches"."approval_mode" is null or "app"."import_batches"."approval_mode" in ('ALL_OR_NOTHING', 'REVIEWED_PARTIAL'));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_decided_ck" CHECK (("app"."import_batches"."status" in ('APPROVED', 'REJECTED')) = ("app"."import_batches"."decided_by" is not null and "app"."import_batches"."decided_at" is not null));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_approved_ck" CHECK (("app"."import_batches"."status" = 'APPROVED') = ("app"."import_batches"."approval_mode" is not null and "app"."import_batches"."approved_row_count" is not null));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_target_ck" CHECK (("app"."import_batches"."kind" = 'OPENING_STOCK') = ("app"."import_batches"."target_opening_batch_id" is not null));--> statement-breakpoint
ALTER TABLE "app"."import_batches" ADD CONSTRAINT "import_batches_counts_ck" CHECK ("app"."import_batches"."row_count" >= 0 and "app"."import_batches"."error_count" >= 0 and "app"."import_batches"."valid_count" >= 0 and "app"."import_batches"."warning_count" >= 0
        and "app"."import_batches"."file_size_bytes" >= 0);