-- AL STORE Phase 02: roles, grants, row-level security, immutability triggers and DB backstops
-- (DATABASE_TRANSACTION_BOUNDARIES §7, INVENTORY_INVARIANTS §3, ADR-001).

CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
--> statement-breakpoint

-- Roles (NOLOGIN; login credentials are provisioned per environment outside migrations).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alstore_app') THEN
    CREATE ROLE alstore_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alstore_readonly') THEN
    CREATE ROLE alstore_readonly NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'alstore_migrator') THEN
    CREATE ROLE alstore_migrator NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Organization of the current transaction, set with set_config('app.org_id', …, true). NULL → no rows.
CREATE FUNCTION app.current_org_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT nullif(pg_catalog.current_setting('app.org_id', true), '')::uuid $$;
--> statement-breakpoint

CREATE FUNCTION app.forbid_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'app.%: append-only, % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END
$$;
--> statement-breakpoint

-- TG_ARGV[0] = comma-separated frozen statuses; TG_ARGV[1..] = columns that may still change.
CREATE FUNCTION app.guard_frozen() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  frozen text[] := pg_catalog.string_to_array(TG_ARGV[0], ',');
  allowed text[] := coalesce(TG_ARGV[1:TG_NARGS - 1], '{}');
BEGIN
  IF OLD.status = ANY (frozen) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'app.%: a % record cannot be deleted', TG_TABLE_NAME, OLD.status
        USING ERRCODE = '55000';
    END IF;
    IF (pg_catalog.to_jsonb(NEW) - allowed) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - allowed) THEN
      RAISE EXCEPTION 'app.%: a % record is immutable', TG_TABLE_NAME, OLD.status
        USING ERRCODE = '55000';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- TG_ARGV[0] = parent table, TG_ARGV[1] = FK column on this table, TG_ARGV[2] = frozen parent statuses.
CREATE FUNCTION app.guard_parent_frozen() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  frozen text[] := pg_catalog.string_to_array(TG_ARGV[2], ',');
  parent_status text;
  row_data jsonb;
BEGIN
  FOREACH row_data IN ARRAY ARRAY[
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN pg_catalog.to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN pg_catalog.to_jsonb(NEW) END
  ] LOOP
    CONTINUE WHEN row_data IS NULL;
    EXECUTE pg_catalog.format('SELECT status FROM app.%I WHERE id = $1', TG_ARGV[0])
      INTO parent_status
      USING (row_data ->> TG_ARGV[1])::uuid;
    IF parent_status = ANY (frozen) THEN
      RAISE EXCEPTION 'app.%: parent %.% is % and its lines are immutable',
        TG_TABLE_NAME, TG_ARGV[0], row_data ->> TG_ARGV[1], parent_status
        USING ERRCODE = '55000';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- products: SKU immutable; unit immutable once any stock movement exists (INV-05).
CREATE FUNCTION app.products_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'app.products: SKU is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.unit IS DISTINCT FROM OLD.unit
     AND EXISTS (SELECT 1 FROM app.stock_movements m WHERE m.product_id = OLD.id) THEN
    RAISE EXCEPTION 'app.products: unit cannot change after stock movements exist'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- Exactly one stock_balances row per product, created in the same transaction as the product.
CREATE FUNCTION app.products_create_balance() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  INSERT INTO app.stock_balances (product_id, org_id, on_hand) VALUES (NEW.id, NEW.org_id, 0);
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- Movement must match its event (type, source, org) and its product (unit, org).
CREATE FUNCTION app.stock_movements_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  ev record;
  prod record;
BEGIN
  SELECT event_type, source_type, org_id INTO ev FROM app.stock_events WHERE id = NEW.stock_event_id;
  IF ev.event_type IS DISTINCT FROM NEW.movement_type
     OR ev.source_type IS DISTINCT FROM NEW.source_type
     OR ev.org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'app.stock_movements: movement does not match its stock event'
      USING ERRCODE = '23514';
  END IF;
  SELECT unit, org_id INTO prod FROM app.products WHERE id = NEW.product_id;
  IF prod.unit IS DISTINCT FROM NEW.unit OR prod.org_id IS DISTINCT FROM NEW.org_id THEN
    RAISE EXCEPTION 'app.stock_movements: unit or organization differs from the product'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- approvals: actor must be an ACTIVE user whose current role equals actor_role; decisions are
-- immutable except APPROVED/REVIEWED → INVALIDATED (SOD-4).
CREATE FUNCTION app.approvals_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.users u JOIN app.user_roles r ON r.user_id = u.id
      WHERE u.id = NEW.actor_id AND u.status = 'ACTIVE' AND r.role = NEW.actor_role
        AND u.org_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'app.approvals: actor is not an active % of this organization', NEW.actor_role
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'app.approvals: approvals cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF OLD.decision NOT IN ('APPROVED', 'REVIEWED') OR NEW.decision <> 'INVALIDATED'
     OR (pg_catalog.to_jsonb(NEW) - 'decision') IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - 'decision') THEN
    RAISE EXCEPTION 'app.approvals: only APPROVED/REVIEWED → INVALIDATED is allowed'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_events', 'stock_events', 'stock_movements', 'tax_invoices', 'tax_invoice_lines',
    'fulfillments', 'fulfillment_lines', 'tax_snapshots', 'tax_period_snapshots', 'payments',
    'payment_allocations', 'customer_refund_liabilities', 'refunds', 'customer_verifications',
    'invoice_pdf_renders', 'book_lines', 'exports', 'edi_filing_receipts', 'settlement_targets'
  ] LOOP
    EXECUTE pg_catalog.format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.forbid_change()',
      t || '_append_only', t);
  END LOOP;
END
$$;
--> statement-breakpoint

CREATE TRIGGER sales_frozen BEFORE UPDATE OR DELETE ON app.sales
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('CONFIRMED,DISCARDED');
--> statement-breakpoint
CREATE TRIGGER correction_documents_frozen BEFORE UPDATE OR DELETE ON app.correction_documents
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('ISSUED,DISCARDED');
--> statement-breakpoint
CREATE TRIGGER goods_receipts_frozen BEFORE UPDATE OR DELETE ON app.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('POSTED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER expenses_frozen BEFORE UPDATE OR DELETE ON app.expenses
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('POSTED');
--> statement-breakpoint
CREATE TRIGGER purchase_invoices_frozen BEFORE UPDATE OR DELETE ON app.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('REGISTERED', 'tax_classification_status');
--> statement-breakpoint
CREATE TRIGGER import_declarations_frozen BEFORE UPDATE OR DELETE ON app.import_declarations
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('REGISTERED', 'tax_classification_status');
--> statement-breakpoint
CREATE TRIGGER inventory_adjustments_frozen BEFORE UPDATE OR DELETE ON app.inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED_POSTED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER fulfillment_corrections_frozen BEFORE UPDATE OR DELETE ON app.fulfillment_corrections
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED_POSTED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER payment_reversals_frozen BEFORE UPDATE OR DELETE ON app.payment_reversals
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED_POSTED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER historical_obligations_frozen BEFORE UPDATE OR DELETE ON app.historical_obligations
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER import_batches_frozen BEFORE UPDATE OR DELETE ON app.import_batches
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER opening_stock_batches_frozen BEFORE UPDATE OR DELETE ON app.opening_stock_batches
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('POSTED');
--> statement-breakpoint
CREATE TRIGGER vat_rule_sets_frozen BEFORE UPDATE OR DELETE ON app.vat_rule_sets
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('ACTIVE,SUPERSEDED', 'status');
--> statement-breakpoint
CREATE TRIGGER vat_rules_frozen BEFORE UPDATE OR DELETE ON app.vat_rules
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('ACTIVE,SUPERSEDED', 'status', 'effective_to');
--> statement-breakpoint
CREATE TRIGGER invoice_series_frozen BEFORE UPDATE OR DELETE ON app.invoice_series
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('CLOSED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER cutover_plans_frozen BEFORE UPDATE OR DELETE ON app.cutover_plans
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('EXECUTED');
--> statement-breakpoint
CREATE TRIGGER org_legal_identity_versions_frozen BEFORE UPDATE OR DELETE ON app.org_legal_identity_versions
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED,SUPERSEDED,REJECTED', 'status');
--> statement-breakpoint

CREATE TRIGGER sale_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.sale_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('sales', 'sale_id', 'CONFIRMED,DISCARDED');
--> statement-breakpoint
CREATE TRIGGER purchase_invoice_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.purchase_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('purchase_invoices', 'invoice_id', 'REGISTERED');
--> statement-breakpoint
CREATE TRIGGER goods_receipt_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('goods_receipts', 'receipt_id', 'POSTED,REJECTED');
--> statement-breakpoint
CREATE TRIGGER correction_document_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.correction_document_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('correction_documents', 'correction_id', 'ACCOUNTANT_APPROVED,ISSUED,DISCARDED');
--> statement-breakpoint
CREATE TRIGGER opening_stock_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.opening_stock_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('opening_stock_batches', 'batch_id', 'SIGNED_OFF,POSTED');
--> statement-breakpoint
CREATE TRIGGER fulfillment_correction_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.fulfillment_correction_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('fulfillment_corrections', 'fulfillment_correction_id', 'APPROVED_POSTED,REJECTED');
--> statement-breakpoint

CREATE TRIGGER products_guard BEFORE UPDATE ON app.products
  FOR EACH ROW EXECUTE FUNCTION app.products_guard();
--> statement-breakpoint
CREATE TRIGGER products_create_balance AFTER INSERT ON app.products
  FOR EACH ROW EXECUTE FUNCTION app.products_create_balance();
--> statement-breakpoint
CREATE TRIGGER stock_movements_guard BEFORE INSERT ON app.stock_movements
  FOR EACH ROW EXECUTE FUNCTION app.stock_movements_guard();
--> statement-breakpoint
CREATE TRIGGER approvals_guard BEFORE INSERT OR UPDATE OR DELETE ON app.approvals
  FOR EACH ROW EXECUTE FUNCTION app.approvals_guard();
--> statement-breakpoint

-- Foreign keys are checked without RLS, so on their own they would let a row point at another
-- organization's row. Every single-column FK between org-scoped tables must stay in the same org.
-- TG_ARGV = repeated triples (column, parent table, parent column).
CREATE FUNCTION app.guard_same_org() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  new_row jsonb := pg_catalog.to_jsonb(NEW);
  ref_value text;
  ref_org uuid;
  i int := 0;
BEGIN
  WHILE i < TG_NARGS LOOP
    ref_value := new_row ->> TG_ARGV[i];
    IF ref_value IS NOT NULL THEN
      EXECUTE pg_catalog.format('SELECT org_id FROM app.%I WHERE %I = $1', TG_ARGV[i + 1], TG_ARGV[i + 2])
        INTO ref_org
        USING ref_value::uuid;
      IF ref_org IS DISTINCT FROM (new_row ->> 'org_id')::uuid THEN
        RAISE EXCEPTION 'app.%: % references a row outside this organization', TG_TABLE_NAME, TG_ARGV[i]
          USING ERRCODE = '42501';
      END IF;
    END IF;
    i := i + 3;
  END LOOP;
  RETURN NEW;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT cl.relname AS child,
      pg_catalog.string_agg(pg_catalog.format('%L, %L, %L', a.attname, pcl.relname, pa.attname), ', '
        ORDER BY a.attname) AS args,
      pg_catalog.string_agg(pg_catalog.format('%I', a.attname), ', ' ORDER BY a.attname) AS cols
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class cl ON cl.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_catalog.pg_class pcl ON pcl.oid = c.confrelid
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_catalog.pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND n.nspname = 'app' AND pg_catalog.cardinality(c.conkey) = 1
      AND pcl.relname <> 'organizations'
      AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute x
        WHERE x.attrelid = c.conrelid AND x.attname = 'org_id' AND NOT x.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_catalog.pg_attribute x
        WHERE x.attrelid = c.confrelid AND x.attname = 'org_id' AND NOT x.attisdropped)
    GROUP BY cl.relname
  LOOP
    EXECUTE pg_catalog.format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF org_id, %s ON app.%I '
      'FOR EACH ROW EXECUTE FUNCTION app.guard_same_org(%s)',
      rec.child || '_same_org', rec.cols, rec.child, rec.args);
  END LOOP;
END
$$;
--> statement-breakpoint

-- No overlapping effective ranges for the same VAT category and scope (CMD-18 backstop).
ALTER TABLE app.vat_rules ADD CONSTRAINT vat_rules_no_overlap_ex EXCLUDE USING gist (
  org_id WITH =,
  category_code WITH =,
  applies_to WITH =,
  daterange(effective_from, effective_to, '[)') WITH &&
) WHERE (status IN ('ACCOUNTANT_APPROVED', 'ACTIVE'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Grants (least privilege; no TRUNCATE, no DDL for the app role)
-- ---------------------------------------------------------------------------

REVOKE ALL ON SCHEMA app FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE
  r text;
BEGIN
  -- Supabase API roles never reach business tables (ADR-001: schema `app` is not exposed).
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON SCHEMA app FROM %I', r);
      EXECUTE pg_catalog.format('REVOKE ALL ON ALL TABLES IN SCHEMA app FROM %I', r);
      EXECUTE pg_catalog.format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', r);
    END IF;
  END LOOP;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO alstore_app, alstore_readonly;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO alstore_app;
--> statement-breakpoint
-- Append-only tables: no UPDATE (and therefore no row locks). settlement_targets keeps UPDATE
-- only so commands can take FOR UPDATE locks; its trigger rejects any actual change.
REVOKE UPDATE ON
  app.audit_events, app.stock_events, app.stock_movements, app.tax_invoices, app.tax_invoice_lines,
  app.fulfillments, app.fulfillment_lines, app.tax_snapshots, app.tax_period_snapshots, app.payments,
  app.payment_allocations, app.customer_refund_liabilities, app.refunds, app.customer_verifications,
  app.invoice_pdf_renders, app.book_lines, app.exports, app.edi_filing_receipts
FROM alstore_app;
--> statement-breakpoint
-- DELETE only on lines of editable drafts and on link rows (parent-frozen triggers still apply).
GRANT DELETE ON
  app.sale_lines, app.purchase_invoice_lines, app.goods_receipt_lines, app.correction_document_lines,
  app.opening_stock_lines, app.fulfillment_correction_lines, app.document_links,
  app.import_declaration_links
TO alstore_app;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA app TO alstore_readonly;
--> statement-breakpoint
-- Resolves a verified session user to its organization and role before the org context exists.
-- SECURITY DEFINER bypasses RLS for this single-row lookup only; callers pass the user id taken
-- from the server-verified session, never from client input.
CREATE FUNCTION app.resolve_actor(p_user_id uuid)
RETURNS TABLE (org_id uuid, role text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.org_id, r.role, u.status
  FROM app.users u JOIN app.user_roles r ON r.user_id = u.id
  WHERE u.id = p_user_id
$$;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.current_org_id() TO alstore_app, alstore_readonly;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.resolve_actor(uuid) TO alstore_app;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-level security: defense in depth for organization isolation (never a substitute for
-- server-side authorization). No policy exists for any other role, so they see nothing.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  key_column text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relkind = 'r'
  LOOP
    key_column := CASE WHEN t = 'organizations' THEN 'id' ELSE 'org_id' END;
    EXECUTE pg_catalog.format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE pg_catalog.format(
      'CREATE POLICY org_isolation ON app.%I TO alstore_app, alstore_readonly '
      'USING (%I = app.current_org_id()) WITH CHECK (%I = app.current_org_id())',
      t, key_column, key_column);
  END LOOP;
END
$$;
