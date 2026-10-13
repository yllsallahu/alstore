-- Rollback of migrations 0002_master_data and 0003_master_data_guards (back to the Phase 02 schema).
--
-- DESTRUCTIVE for Phase 03 data: drops unit-migration requests, identifier format rules, the
-- verification identity hash and the new customer/supplier columns. Valid only while the
-- database holds no business data (development, CI, a staging rebuild). After real data
-- exists, fix forward with a reviewed migration (docs/PHASE_03.md §5).
--
-- Run as the migration owner:  psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0002_0003_down.sql
-- Then `npm run db:migrate` re-applies 0002 and 0003.

BEGIN;

-- Phase 02 version of the products guard.
CREATE OR REPLACE FUNCTION app.products_guard() RETURNS trigger
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

DROP TABLE app.product_unit_changes;
DROP TABLE app.identifier_format_rules;
DROP FUNCTION app.identifier_format_rules_guard();

ALTER TABLE app.customer_verifications
  DROP CONSTRAINT customer_verifications_identity_hash_ck,
  DROP CONSTRAINT customer_verifications_no_official_ck,
  DROP CONSTRAINT customer_verifications_note_ck,
  DROP COLUMN identity_hash;

ALTER TABLE app.customers
  DROP CONSTRAINT customers_legal_name_ck,
  DROP CONSTRAINT customers_identifiers_ck,
  DROP CONSTRAINT customers_address_ck,
  DROP CONSTRAINT customers_city_ck,
  DROP COLUMN city;

ALTER TABLE app.suppliers
  DROP CONSTRAINT suppliers_legal_name_ck,
  DROP CONSTRAINT suppliers_identifiers_ck,
  DROP CONSTRAINT suppliers_address_ck,
  DROP CONSTRAINT suppliers_city_ck,
  DROP CONSTRAINT suppliers_invoice_reference_ck,
  DROP COLUMN address,
  DROP COLUMN city,
  DROP COLUMN invoice_reference_note,
  DROP COLUMN updated_at;

DROP INDEX app.products_barcode_uq;
DROP INDEX app.products_sku_prefix_idx;
ALTER TABLE app.products
  DROP CONSTRAINT products_sku_format_ck,
  DROP CONSTRAINT products_name_ck,
  DROP CONSTRAINT products_barcode_ck,
  DROP COLUMN version;

-- Forget the two migrations so the migrator applies them again.
DELETE FROM drizzle.__drizzle_migrations WHERE created_at >= 1791856104206;

COMMIT;
