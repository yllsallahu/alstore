CREATE TABLE "app"."identifier_format_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"digits_only" boolean DEFAULT true NOT NULL,
	"min_length" integer NOT NULL,
	"max_length" integer NOT NULL,
	"source_note" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_by" uuid,
	"retired_at" timestamp with time zone,
	CONSTRAINT "identifier_format_rules_type_ck" CHECK ("app"."identifier_format_rules"."identifier_type" in ('BUSINESS_NUMBER', 'FISCAL_NUMBER', 'VAT_NUMBER')),
	CONSTRAINT "identifier_format_rules_status_ck" CHECK ("app"."identifier_format_rules"."status" in ('ACTIVE', 'RETIRED')),
	CONSTRAINT "identifier_format_rules_length_ck" CHECK ("app"."identifier_format_rules"."min_length" >= 1 and "app"."identifier_format_rules"."max_length" >= "app"."identifier_format_rules"."min_length" and "app"."identifier_format_rules"."max_length" <= 40),
	CONSTRAINT "identifier_format_rules_source_ck" CHECK (btrim("app"."identifier_format_rules"."source_note") <> '' and char_length("app"."identifier_format_rules"."source_note") <= 500),
	CONSTRAINT "identifier_format_rules_retired_ck" CHECK (("app"."identifier_format_rules"."status" = 'RETIRED') = ("app"."identifier_format_rules"."retired_by" is not null and "app"."identifier_format_rules"."retired_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "app"."product_unit_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"from_unit" text NOT NULL,
	"to_unit" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_comment" text,
	"approval_id" uuid,
	CONSTRAINT "product_unit_changes_from_ck" CHECK ("app"."product_unit_changes"."from_unit" in ('KG', 'M2', 'COPE')),
	CONSTRAINT "product_unit_changes_to_ck" CHECK ("app"."product_unit_changes"."to_unit" in ('KG', 'M2', 'COPE')),
	CONSTRAINT "product_unit_changes_status_ck" CHECK ("app"."product_unit_changes"."status" in ('PENDING_APPROVAL', 'APPROVED_APPLIED', 'REJECTED', 'CANCELLED')),
	CONSTRAINT "product_unit_changes_units_ck" CHECK ("app"."product_unit_changes"."from_unit" <> "app"."product_unit_changes"."to_unit"),
	CONSTRAINT "product_unit_changes_reason_ck" CHECK (btrim("app"."product_unit_changes"."reason") <> '' and char_length("app"."product_unit_changes"."reason") <= 500),
	CONSTRAINT "product_unit_changes_decided_ck" CHECK (("app"."product_unit_changes"."status" = 'PENDING_APPROVAL') = ("app"."product_unit_changes"."decided_by" is null and "app"."product_unit_changes"."decided_at" is null)),
	CONSTRAINT "product_unit_changes_four_eyes_ck" CHECK ("app"."product_unit_changes"."status" not in ('APPROVED_APPLIED', 'REJECTED') or "app"."product_unit_changes"."decided_by" <> "app"."product_unit_changes"."requested_by"),
	CONSTRAINT "product_unit_changes_cancel_ck" CHECK ("app"."product_unit_changes"."status" <> 'CANCELLED' or "app"."product_unit_changes"."decided_by" = "app"."product_unit_changes"."requested_by"),
	CONSTRAINT "product_unit_changes_approval_ck" CHECK ("app"."product_unit_changes"."status" <> 'APPROVED_APPLIED' or "app"."product_unit_changes"."approval_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD COLUMN "identity_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD COLUMN "invoice_reference_note" text;--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."products" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."identifier_format_rules" ADD CONSTRAINT "identifier_format_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."identifier_format_rules" ADD CONSTRAINT "identifier_format_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."identifier_format_rules" ADD CONSTRAINT "identifier_format_rules_retired_by_users_id_fk" FOREIGN KEY ("retired_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_unit_changes" ADD CONSTRAINT "product_unit_changes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "app"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_unit_changes" ADD CONSTRAINT "product_unit_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_unit_changes" ADD CONSTRAINT "product_unit_changes_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_unit_changes" ADD CONSTRAINT "product_unit_changes_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."product_unit_changes" ADD CONSTRAINT "product_unit_changes_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "app"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identifier_format_rules_one_active_uq" ON "app"."identifier_format_rules" USING btree ("org_id","identifier_type") WHERE "app"."identifier_format_rules"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "product_unit_changes_one_pending_uq" ON "app"."product_unit_changes" USING btree ("product_id") WHERE "app"."product_unit_changes"."status" = 'PENDING_APPROVAL';--> statement-breakpoint
CREATE UNIQUE INDEX "products_barcode_uq" ON "app"."products" USING btree ("org_id","barcode") WHERE "app"."products"."barcode" is not null;--> statement-breakpoint
CREATE INDEX "products_sku_prefix_idx" ON "app"."products" USING btree ("org_id","sku" text_pattern_ops);--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_identity_hash_ck" CHECK ("app"."customer_verifications"."identity_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_no_official_ck" CHECK ("app"."customer_verifications"."method" <> 'OFFICIAL_SOURCE');--> statement-breakpoint
ALTER TABLE "app"."customer_verifications" ADD CONSTRAINT "customer_verifications_note_ck" CHECK ("app"."customer_verifications"."method" not in ('MANUAL_EVIDENCE', 'SUSPENSION', 'REINSTATEMENT')
        or ("app"."customer_verifications"."note" is not null and btrim("app"."customer_verifications"."note") <> ''));--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_legal_name_ck" CHECK (btrim("app"."customers"."legal_name") <> '' and char_length("app"."customers"."legal_name") <= 200);--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_identifiers_ck" CHECK (jsonb_typeof("app"."customers"."identifiers") = 'object');--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_address_ck" CHECK ("app"."customers"."address" is null or (btrim("app"."customers"."address") <> '' and char_length("app"."customers"."address") <= 300));--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_city_ck" CHECK ("app"."customers"."city" is null or (btrim("app"."customers"."city") <> '' and char_length("app"."customers"."city") <= 100));--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_legal_name_ck" CHECK (btrim("app"."suppliers"."legal_name") <> '' and char_length("app"."suppliers"."legal_name") <= 200);--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_identifiers_ck" CHECK (jsonb_typeof("app"."suppliers"."identifiers") = 'object');--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_address_ck" CHECK ("app"."suppliers"."address" is null or (btrim("app"."suppliers"."address") <> '' and char_length("app"."suppliers"."address") <= 300));--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_city_ck" CHECK ("app"."suppliers"."city" is null or (btrim("app"."suppliers"."city") <> '' and char_length("app"."suppliers"."city") <= 100));--> statement-breakpoint
ALTER TABLE "app"."suppliers" ADD CONSTRAINT "suppliers_invoice_reference_ck" CHECK ("app"."suppliers"."invoice_reference_note" is null or (btrim("app"."suppliers"."invoice_reference_note") <> '' and char_length("app"."suppliers"."invoice_reference_note") <= 300));--> statement-breakpoint
ALTER TABLE "app"."products" ADD CONSTRAINT "products_sku_format_ck" CHECK ("app"."products"."sku" ~ '^[A-Z0-9][A-Z0-9./_-]{0,39}$');--> statement-breakpoint
ALTER TABLE "app"."products" ADD CONSTRAINT "products_name_ck" CHECK (btrim("app"."products"."name") <> '' and char_length("app"."products"."name") <= 200);--> statement-breakpoint
ALTER TABLE "app"."products" ADD CONSTRAINT "products_barcode_ck" CHECK ("app"."products"."barcode" is null or "app"."products"."barcode" ~ '^[A-Z0-9-]{4,64}$');