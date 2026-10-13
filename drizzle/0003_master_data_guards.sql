-- AL STORE Phase 03: database backstops for master data (products, customers, suppliers).
-- New tables get the same RLS, grants and same-organization FK guards as Phase 02 tables.

-- ---------------------------------------------------------------------------
-- INV-05: a product's unit never changes after its first stock movement, except through an
-- explicit four-eyes approved unit migration (app.product_unit_changes) decided in the SAME
-- transaction, at zero on-hand stock. No conversion of quantities ever happens.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.products_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  raw_change text := pg_catalog.current_setting('app.unit_change_id', true);
  change_id uuid;
BEGIN
  IF NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'app.products: SKU is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.unit IS DISTINCT FROM OLD.unit
     AND EXISTS (SELECT 1 FROM app.stock_movements m WHERE m.product_id = OLD.id) THEN
    IF raw_change ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      change_id := raw_change::uuid;
    END IF;
    IF change_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM app.product_unit_changes c
      WHERE c.id = change_id AND c.product_id = OLD.id AND c.org_id = OLD.org_id
        AND c.from_unit = OLD.unit AND c.to_unit = NEW.unit
        AND c.status = 'APPROVED_APPLIED' AND c.decided_at = pg_catalog.now()
    ) THEN
      RAISE EXCEPTION 'app.products: unit cannot change after stock movements exist without an approved unit migration'
        USING ERRCODE = '55000';
    END IF;
    IF EXISTS (SELECT 1 FROM app.stock_balances b WHERE b.product_id = OLD.id AND b.on_hand <> 0) THEN
      RAISE EXCEPTION 'app.products: a unit migration requires zero stock on hand'
        USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

CREATE TRIGGER product_unit_changes_frozen BEFORE UPDATE OR DELETE ON app.product_unit_changes
  FOR EACH ROW EXECUTE FUNCTION app.guard_frozen('APPROVED_APPLIED,REJECTED,CANCELLED');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- identifier_format_rules: written by an ACTIVE ACCOUNTANT only (P-15); an ACTIVE rule may only be
-- retired; a RETIRED rule never changes; nothing is deleted.
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.identifier_format_rules_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  writer uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'app.identifier_format_rules: rules cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'app.identifier_format_rules: a new rule must be ACTIVE' USING ERRCODE = '23514';
    END IF;
    writer := NEW.created_by;
  ELSE
    IF OLD.status <> 'ACTIVE' OR NEW.status <> 'RETIRED'
       OR (pg_catalog.to_jsonb(NEW) - ARRAY['status', 'retired_by', 'retired_at'])
          IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - ARRAY['status', 'retired_by', 'retired_at']) THEN
      RAISE EXCEPTION 'app.identifier_format_rules: only ACTIVE → RETIRED is allowed' USING ERRCODE = '55000';
    END IF;
    writer := NEW.retired_by;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app.users u JOIN app.user_roles r ON r.user_id = u.id
    WHERE u.id = writer AND u.status = 'ACTIVE' AND r.role = 'ACCOUNTANT' AND u.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'app.identifier_format_rules: only an active ACCOUNTANT may change rules'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.identifier_format_rules_guard() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER identifier_format_rules_guard BEFORE INSERT OR UPDATE OR DELETE ON app.identifier_format_rules
  FOR EACH ROW EXECUTE FUNCTION app.identifier_format_rules_guard();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Same-organization FK guards for the new tables (same generator as 0001).
-- ---------------------------------------------------------------------------
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
      AND cl.relname IN ('product_unit_changes', 'identifier_format_rules')
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

-- ---------------------------------------------------------------------------
-- Grants and row-level security for the new tables (no DELETE, no TRUNCATE).
-- ---------------------------------------------------------------------------
REVOKE ALL ON app.product_unit_changes, app.identifier_format_rules FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE
  r text;
BEGIN
  -- Supabase API roles never reach business tables (ADR-001).
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE pg_catalog.format(
        'REVOKE ALL ON app.product_unit_changes, app.identifier_format_rules FROM %I', r);
    END IF;
  END LOOP;
END
$$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON app.product_unit_changes, app.identifier_format_rules TO alstore_app;
--> statement-breakpoint
GRANT SELECT ON app.product_unit_changes, app.identifier_format_rules TO alstore_readonly;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_unit_changes', 'identifier_format_rules'] LOOP
    EXECUTE pg_catalog.format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE pg_catalog.format(
      'CREATE POLICY org_isolation ON app.%I TO alstore_app, alstore_readonly '
      'USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id())', t);
  END LOOP;
END
$$;
