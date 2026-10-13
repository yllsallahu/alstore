-- Rollback of migrations 0004_import_and_opening_stock and 0005_import_opening_stock_guards
-- (back to the Phase 03 schema).
--
-- DESTRUCTIVE for Phase 04 data: drops staged import rows, the import / count / sign-off columns
-- and the INV-08 guards. Valid only while the database holds no business data (development, CI, a
-- staging rebuild). After a real opening batch has been POSTED, never roll back: the stock ledger
-- would lose its OPENING source; fix forward with a reviewed migration (docs/PHASE_04.md §6).
--
-- Run as the migration owner:  psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0004_0005_down.sql
-- Then `npm run db:migrate` re-applies 0004 and 0005.
-- Rolling back further (0002/0003, 0000/0001) must run this script first.

BEGIN;

-- Phase 03 triggers and functions of the opening stock flow.
DROP TRIGGER stock_events_opening_guard ON app.stock_events;
DROP FUNCTION app.stock_events_opening_guard();
DROP TRIGGER opening_stock_batches_transition ON app.opening_stock_batches;
DROP FUNCTION app.opening_stock_batches_transition();
DROP TRIGGER cutover_plans_guard ON app.cutover_plans;
DROP FUNCTION app.cutover_plans_guard();
DROP TRIGGER invoice_series_guard ON app.invoice_series;
DROP FUNCTION app.invoice_series_guard();
DROP TRIGGER import_batch_rows_parent_frozen ON app.import_batch_rows;

DROP TRIGGER opening_stock_lines_parent_frozen ON app.opening_stock_lines;
CREATE TRIGGER opening_stock_lines_parent_frozen BEFORE INSERT OR UPDATE OR DELETE ON app.opening_stock_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_parent_frozen('opening_stock_batches', 'batch_id', 'SIGNED_OFF,POSTED');

-- Phase 01 version of the stock movement guard (without INV-08 and the OPENING match).
CREATE OR REPLACE FUNCTION app.stock_movements_guard() RETURNS trigger
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

DROP FUNCTION app.stock_tracking_status(uuid);
DROP FUNCTION app.opening_lines_hash(uuid);

-- Same-organization guards reference the columns dropped below; they are rebuilt afterwards.
DROP TRIGGER IF EXISTS import_batches_same_org ON app.import_batches;
DROP TRIGGER IF EXISTS opening_stock_batches_same_org ON app.opening_stock_batches;
DROP TRIGGER IF EXISTS cutover_plans_same_org ON app.cutover_plans;
DROP TRIGGER IF EXISTS invoice_series_same_org ON app.invoice_series;

DROP TABLE app.import_batch_rows;

ALTER TABLE app.import_batches
  DROP CONSTRAINT import_batches_format_ck,
  DROP CONSTRAINT import_batches_preview_hash_ck,
  DROP CONSTRAINT import_batches_approval_mode_ck,
  DROP CONSTRAINT import_batches_decided_ck,
  DROP CONSTRAINT import_batches_approved_ck,
  DROP CONSTRAINT import_batches_target_ck,
  DROP CONSTRAINT import_batches_counts_ck,
  DROP COLUMN file_format,
  DROP COLUMN file_size_bytes,
  DROP COLUMN valid_count,
  DROP COLUMN warning_count,
  DROP COLUMN headers,
  DROP COLUMN column_mapping,
  DROP COLUMN preview_hash,
  DROP COLUMN target_opening_batch_id,
  DROP COLUMN approval_mode,
  DROP COLUMN approved_row_count,
  DROP COLUMN decided_by,
  DROP COLUMN decided_at,
  DROP COLUMN decision_note;
ALTER TABLE app.import_batches
  ADD CONSTRAINT import_batches_counts_ck CHECK (row_count >= 0 AND error_count >= 0);

ALTER TABLE app.opening_stock_batches
  DROP CONSTRAINT opening_stock_batches_plan_uq,
  DROP CONSTRAINT opening_stock_batches_lines_hash_ck,
  DROP CONSTRAINT opening_stock_batches_counted_ck,
  DROP CONSTRAINT opening_stock_batches_reconciled_ck,
  DROP CONSTRAINT opening_stock_batches_signed_ck,
  DROP CONSTRAINT opening_stock_batches_posted_ck,
  DROP COLUMN counted_by,
  DROP COLUMN counted_at,
  DROP COLUMN reconciliation_note,
  DROP COLUMN reconciled_by,
  DROP COLUMN reconciled_at,
  DROP COLUMN reconciliation_approval_id,
  DROP COLUMN lines_hash,
  DROP COLUMN signed_off_by,
  DROP COLUMN signed_off_at,
  DROP COLUMN signoff_approval_id,
  DROP COLUMN unknown_acknowledged_count,
  DROP COLUMN posted_at,
  DROP COLUMN posted_stock_event_id;

ALTER TABLE app.cutover_plans
  DROP CONSTRAINT cutover_plans_instant_ck,
  DROP CONSTRAINT cutover_plans_mid_month_ck,
  DROP COLUMN created_by,
  DROP COLUMN mid_month_acknowledged,
  DROP COLUMN version,
  DROP COLUMN updated_at;

ALTER TABLE app.invoice_series
  DROP COLUMN proposed_by,
  DROP COLUMN version,
  DROP COLUMN updated_at;

-- Rebuild the same-organization guards for the tables that lost foreign keys.
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
      AND cl.relname IN ('import_batches', 'opening_stock_batches', 'cutover_plans', 'invoice_series')
    GROUP BY cl.relname
  LOOP
    EXECUTE pg_catalog.format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF org_id, %s ON app.%I '
      'FOR EACH ROW EXECUTE FUNCTION app.guard_same_org(%s)',
      rec.child || '_same_org', rec.cols, rec.child, rec.args);
  END LOOP;
END
$$;

-- Forget the two migrations so the migrator applies them again.
DELETE FROM drizzle.__drizzle_migrations WHERE created_at >= 1791898548923;

COMMIT;
