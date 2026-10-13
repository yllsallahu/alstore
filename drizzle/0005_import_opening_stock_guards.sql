-- AL STORE Phase 04: database backstops for the validated product import, the physically
-- confirmed opening stock and the cutover setup (INVENTORY_INVARIANTS INV-08…INV-11,
-- DATABASE_TRANSACTION_BOUNDARIES CMD-14 / CMD-16).

-- ---------------------------------------------------------------------------
-- Derived stock tracking status (INV-08): KNOWN / UNKNOWN per product.
--   KNOWN  = a POSTED opening batch exists for the organization AND
--            (the product's posted opening line is VERIFIED_QTY / VERIFIED_ZERO,
--             OR the product was created after the opening batch was POSTED,
--             OR an approved OPENING_RESOLUTION adjustment exists for it).
-- Everything else — including every product while no opening batch is POSTED — is UNKNOWN.
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.stock_tracking_status(p_product uuid) RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  WITH p AS (
    SELECT id, org_id, created_at FROM app.products WHERE id = p_product
  ), b AS (
    SELECT ob.id, ob.posted_at FROM app.opening_stock_batches ob JOIN p ON p.org_id = ob.org_id
    WHERE ob.status = 'POSTED'
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM b) THEN 'UNKNOWN'
    WHEN EXISTS (
      SELECT 1 FROM app.opening_stock_lines l JOIN b ON b.id = l.batch_id
      WHERE l.product_id = p_product AND l.status IN ('VERIFIED_QTY', 'VERIFIED_ZERO')
    ) THEN 'KNOWN'
    WHEN EXISTS (SELECT 1 FROM p JOIN b ON p.created_at > b.posted_at) THEN 'KNOWN'
    WHEN EXISTS (
      SELECT 1 FROM app.inventory_adjustments a
      WHERE a.product_id = p_product AND a.kind = 'OPENING_RESOLUTION' AND a.status = 'APPROVED_POSTED'
    ) THEN 'KNOWN'
    ELSE 'UNKNOWN'
  END
$$;
--> statement-breakpoint

-- Content hash of an opening batch's lines; reconciliation and sign-off must present the same value.
CREATE FUNCTION app.opening_lines_hash(p_batch uuid) RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    coalesce(pg_catalog.string_agg(
      l.product_id::text || ':' || l.status || ':' || coalesce(l.quantity::text, '-'),
      ',' ORDER BY l.product_id), ''), 'UTF8')), 'hex')
  FROM app.opening_stock_lines l WHERE l.batch_id = p_batch
$$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- stock_movements: sale / receipt / fulfillment-correction movements are impossible for a SKU that
-- is not KNOWN; an OPENING movement must match a VERIFIED_QTY line of the SIGNED_OFF batch that is
-- being posted (same product, same quantity).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.stock_movements_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  ev record;
  prod record;
BEGIN
  SELECT event_type, source_type, source_id, org_id INTO ev FROM app.stock_events WHERE id = NEW.stock_event_id;
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
  IF NEW.movement_type IN ('SALE_FULFILLMENT', 'PURCHASE_RECEIPT', 'FULFILLMENT_CORRECTION')
     AND app.stock_tracking_status(NEW.product_id) <> 'KNOWN' THEN
    RAISE EXCEPTION 'app.stock_movements: product % has unknown opening stock status (INV-08)', NEW.product_id
      USING ERRCODE = '55000';
  END IF;
  IF NEW.movement_type = 'OPENING' THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.opening_stock_lines l JOIN app.opening_stock_batches b ON b.id = l.batch_id
      WHERE l.id = NEW.source_line_id AND l.product_id = NEW.product_id AND l.status = 'VERIFIED_QTY'
        AND l.quantity = NEW.quantity_delta AND b.id = ev.source_id AND b.status = 'SIGNED_OFF'
        AND b.org_id = NEW.org_id
    ) THEN
      RAISE EXCEPTION 'app.stock_movements: an OPENING movement must match a verified line of the signed-off batch'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint

-- An OPENING stock event needs a SIGNED_OFF batch, its LOCKED plan and the plan's cutover instant.
CREATE FUNCTION app.stock_events_opening_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF NEW.event_type = 'OPENING' AND NOT EXISTS (
    SELECT 1 FROM app.opening_stock_batches b JOIN app.cutover_plans p ON p.id = b.cutover_plan_id
    WHERE b.id = NEW.source_id AND b.org_id = NEW.org_id AND b.status = 'SIGNED_OFF'
      AND p.status = 'LOCKED' AND p.cutover_instant = NEW.effective_at
      AND p.planned_cutover_date = NEW.document_date
  ) THEN
    RAISE EXCEPTION 'app.stock_events: an OPENING event needs a signed-off batch and its locked cutover plan'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER stock_events_opening_guard BEFORE INSERT ON app.stock_events
  FOR EACH ROW EXECUTE FUNCTION app.stock_events_opening_guard();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- opening_stock_batches: legal transitions, approvals by the right role and the same lines hash.
--   DRAFT ⇄ COUNTED ⇄ RECONCILED → SIGNED_OFF → POSTED
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.opening_stock_batches_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  ap record;
  allowed text[];
  expected_hash text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'app.opening_stock_batches: a batch starts as DRAFT' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM app.cutover_plans p
      WHERE p.id = NEW.cutover_plan_id AND p.org_id = NEW.org_id AND p.status = 'DRAFT'
        AND p.last_excel_day = NEW.counted_as_of
    ) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: needs a DRAFT cutover plan with the same last Excel day'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.cutover_plan_id IS DISTINCT FROM OLD.cutover_plan_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'app.opening_stock_batches: organization, plan and creator are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = OLD.status THEN
    -- Only the counted-as-of day may follow a plan edit, and only while DRAFT.
    IF OLD.status <> 'DRAFT'
       OR (pg_catalog.to_jsonb(NEW) - 'counted_as_of') IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - 'counted_as_of') THEN
      RAISE EXCEPTION 'app.opening_stock_batches: a % batch cannot be changed', OLD.status
        USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.counted_as_of IS DISTINCT FROM OLD.counted_as_of THEN
    RAISE EXCEPTION 'app.opening_stock_batches: counted-as-of day can only change while DRAFT'
      USING ERRCODE = '55000';
  END IF;

  allowed := CASE OLD.status || '>' || NEW.status
    WHEN 'DRAFT>COUNTED' THEN ARRAY['status', 'counted_by', 'counted_at']
    WHEN 'COUNTED>DRAFT' THEN ARRAY['status', 'counted_by', 'counted_at']
    WHEN 'COUNTED>RECONCILED' THEN ARRAY['status', 'reconciled_by', 'reconciled_at',
      'reconciliation_note', 'reconciliation_approval_id', 'lines_hash']
    WHEN 'RECONCILED>COUNTED' THEN ARRAY['status', 'reconciled_by', 'reconciled_at',
      'reconciliation_note', 'reconciliation_approval_id', 'lines_hash']
    WHEN 'RECONCILED>SIGNED_OFF' THEN ARRAY['status', 'signed_off_by', 'signed_off_at',
      'signoff_approval_id', 'unknown_acknowledged_count']
    WHEN 'SIGNED_OFF>POSTED' THEN ARRAY['status', 'posted_at', 'posted_stock_event_id']
    ELSE NULL
  END;
  IF allowed IS NULL THEN
    RAISE EXCEPTION 'app.opening_stock_batches: % → % is not a legal transition', OLD.status, NEW.status
      USING ERRCODE = '55000';
  END IF;
  IF (pg_catalog.to_jsonb(NEW) - allowed) IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'app.opening_stock_batches: % → % may not change other columns', OLD.status, NEW.status
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = 'COUNTED' AND OLD.status = 'DRAFT' THEN
    IF NOT EXISTS (SELECT 1 FROM app.opening_stock_lines l WHERE l.batch_id = NEW.id) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: counting cannot be completed without any line'
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'RECONCILED' THEN
    SELECT * INTO ap FROM app.approvals WHERE id = NEW.reconciliation_approval_id;
    IF NOT FOUND OR ap.org_id <> NEW.org_id OR ap.subject_type <> 'OPENING_STOCK_BATCH'
       OR ap.subject_id <> NEW.id OR ap.approval_kind <> 'OPENING_RECONCILED'
       OR ap.decision <> 'REVIEWED' OR ap.actor_id <> NEW.reconciled_by OR ap.actor_role <> 'ACCOUNTANT'
       OR ap.subject_hash IS DISTINCT FROM NEW.lines_hash THEN
      RAISE EXCEPTION 'app.opening_stock_batches: reconciliation needs the accountant''s REVIEWED approval of these lines'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.lines_hash IS DISTINCT FROM app.opening_lines_hash(NEW.id) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: lines changed after the hash was taken' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'SIGNED_OFF' THEN
    SELECT * INTO ap FROM app.approvals WHERE id = NEW.signoff_approval_id;
    IF NOT FOUND OR ap.org_id <> NEW.org_id OR ap.subject_type <> 'OPENING_STOCK_BATCH'
       OR ap.subject_id <> NEW.id OR ap.approval_kind <> 'OPENING_SIGNOFF'
       OR ap.decision <> 'APPROVED' OR ap.actor_id <> NEW.signed_off_by OR ap.actor_role <> 'DIRECTOR'
       OR ap.subject_hash IS DISTINCT FROM OLD.lines_hash
       OR NOT ap.requires_four_eyes OR ap.requester_id IS DISTINCT FROM OLD.reconciled_by THEN
      RAISE EXCEPTION 'app.opening_stock_batches: sign-off needs the director''s APPROVED approval of the reconciled lines'
        USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM app.approvals r WHERE r.id = OLD.reconciliation_approval_id AND r.decision = 'REVIEWED'
    ) OR OLD.lines_hash IS DISTINCT FROM app.opening_lines_hash(NEW.id) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: the reconciliation is no longer valid' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'POSTED' THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.stock_events e
      WHERE e.id = NEW.posted_stock_event_id AND e.org_id = NEW.org_id AND e.event_type = 'OPENING'
        AND e.source_type = 'OPENING_STOCK_BATCH' AND e.source_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: posting needs its OPENING stock event' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM app.opening_stock_lines l
      WHERE l.batch_id = NEW.id AND l.status = 'VERIFIED_QTY' AND NOT EXISTS (
        SELECT 1 FROM app.stock_movements m
        WHERE m.stock_event_id = NEW.posted_stock_event_id AND m.source_line_id = l.id
          AND m.product_id = l.product_id AND m.quantity_delta = l.quantity)
    ) OR EXISTS (
      SELECT 1 FROM app.stock_movements m
      WHERE m.stock_event_id = NEW.posted_stock_event_id AND NOT EXISTS (
        SELECT 1 FROM app.opening_stock_lines l
        WHERE l.id = m.source_line_id AND l.batch_id = NEW.id AND l.status = 'VERIFIED_QTY')
    ) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: movements do not match the verified lines one to one'
        USING ERRCODE = '23514';
    END IF;
    -- INV-01 for every counted product: balance equals the ledger.
    IF EXISTS (
      SELECT 1 FROM app.opening_stock_lines l JOIN app.stock_balances sb ON sb.product_id = l.product_id
      WHERE l.batch_id = NEW.id AND l.status = 'VERIFIED_QTY'
        AND sb.on_hand <> (SELECT coalesce(sum(m.quantity_delta), 0) FROM app.stock_movements m WHERE m.product_id = l.product_id)
    ) THEN
      RAISE EXCEPTION 'app.opening_stock_batches: stock balance and ledger differ after posting'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER opening_stock_batches_transition BEFORE INSERT OR UPDATE ON app.opening_stock_batches
  FOR EACH ROW EXECUTE FUNCTION app.opening_stock_batches_transition();
--> statement-breakpoint

-- Lines are editable only while the batch is DRAFT (counting complete freezes them).
DROP TRIGGER opening_stock_lines_parent_frozen ON app.opening_stock_lines;
--> statement-breakpoint
CREATE TRIGGER opening_stock_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.opening_stock_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('opening_stock_batches', 'batch_id', 'COUNTED,RECONCILED,SIGNED_OFF,POSTED');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- cutover_plans: DRAFT is editable until counting is complete; LOCKED only through the signed-off
-- opening batch; LOCKED never goes back; EXECUTED is Phase 20.
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.cutover_plans_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'app.cutover_plans: a plan starts as DRAFT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.org_id IS DISTINCT FROM OLD.org_id OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'app.cutover_plans: organization and creator are immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status = 'DRAFT' THEN
    IF (NEW.planned_cutover_date, NEW.last_excel_day) IS DISTINCT FROM (OLD.planned_cutover_date, OLD.last_excel_day)
       AND EXISTS (SELECT 1 FROM app.opening_stock_batches b WHERE b.cutover_plan_id = OLD.id AND b.status <> 'DRAFT') THEN
      RAISE EXCEPTION 'app.cutover_plans: dates cannot change once counting is complete' USING ERRCODE = '55000';
    END IF;
  ELSIF OLD.status = 'DRAFT' AND NEW.status = 'LOCKED' THEN
    IF NEW.signed_by IS NULL OR NEW.signed_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM app.opening_stock_batches b
      WHERE b.cutover_plan_id = OLD.id AND b.status = 'SIGNED_OFF' AND b.signed_off_by = NEW.signed_by
    ) THEN
      RAISE EXCEPTION 'app.cutover_plans: locking needs the signed-off opening stock of this plan' USING ERRCODE = '23514';
    END IF;
    IF (pg_catalog.to_jsonb(NEW) - ARRAY['status', 'signed_by', 'signed_at', 'version', 'updated_at'])
       IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - ARRAY['status', 'signed_by', 'signed_at', 'version', 'updated_at']) THEN
      RAISE EXCEPTION 'app.cutover_plans: locking may not change other columns' USING ERRCODE = '55000';
    END IF;
  ELSIF OLD.status = 'LOCKED' AND NEW.status = 'EXECUTED' THEN
    IF (pg_catalog.to_jsonb(NEW) - ARRAY['status', 'version', 'updated_at'])
       IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - ARRAY['status', 'version', 'updated_at']) THEN
      RAISE EXCEPTION 'app.cutover_plans: executing may not change other columns' USING ERRCODE = '55000';
    END IF;
  ELSE
    RAISE EXCEPTION 'app.cutover_plans: % → % is not allowed', OLD.status, NEW.status USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER cutover_plans_guard BEFORE INSERT OR UPDATE ON app.cutover_plans
  FOR EACH ROW EXECUTE FUNCTION app.cutover_plans_guard();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- invoice_series: a proposal starts PROPOSED; once it leaves PROPOSED the series identity and the
-- legacy last number never change (continuation is an accountant decision, VG-05).
-- ---------------------------------------------------------------------------
CREATE FUNCTION app.invoice_series_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PROPOSED' THEN
      RAISE EXCEPTION 'app.invoice_series: a series starts as PROPOSED' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'PROPOSED'
     AND (NEW.fiscal_year, NEW.kind, NEW.code, NEW.legacy_last_number)
       IS DISTINCT FROM (OLD.fiscal_year, OLD.kind, OLD.code, OLD.legacy_last_number) THEN
    RAISE EXCEPTION 'app.invoice_series: year, kind, code and legacy last number are fixed once decided'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'PROPOSED' AND NEW.status NOT IN ('PROPOSED', 'ACCOUNTANT_APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'app.invoice_series: a proposal can only be approved or rejected' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER invoice_series_guard BEFORE INSERT OR UPDATE ON app.invoice_series
  FOR EACH ROW EXECUTE FUNCTION app.invoice_series_guard();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- import_batch_rows: grants, RLS, frozen once the batch is decided.
-- ---------------------------------------------------------------------------
CREATE TRIGGER import_batch_rows_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.import_batch_rows
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('import_batches', 'batch_id', 'APPROVED,REJECTED');
--> statement-breakpoint
REVOKE ALL ON app.import_batch_rows FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE pg_catalog.format('REVOKE ALL ON app.import_batch_rows FROM %I', r);
    END IF;
  END LOOP;
END
$$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON app.import_batch_rows TO alstore_app;
--> statement-breakpoint
GRANT SELECT ON app.import_batch_rows TO alstore_readonly;
--> statement-breakpoint
ALTER TABLE app.import_batch_rows ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY org_isolation ON app.import_batch_rows TO alstore_app, alstore_readonly
  USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Same-organization FK guards, regenerated for the tables that gained foreign keys.
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
      AND cl.relname IN ('import_batches', 'import_batch_rows', 'opening_stock_batches',
                         'cutover_plans', 'invoice_series')
    GROUP BY cl.relname
  LOOP
    EXECUTE pg_catalog.format('DROP TRIGGER IF EXISTS %I ON app.%I', rec.child || '_same_org', rec.child);
    EXECUTE pg_catalog.format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF org_id, %s ON app.%I '
      'FOR EACH ROW EXECUTE FUNCTION app.guard_same_org(%s)',
      rec.child || '_same_org', rec.cols, rec.child, rec.args);
  END LOOP;
END
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.stock_tracking_status(uuid), app.opening_lines_hash(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.stock_tracking_status(uuid), app.opening_lines_hash(uuid) TO alstore_app, alstore_readonly;
