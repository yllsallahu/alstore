-- Rollback of migrations 0000_initial_schema and 0001_security_guards.
--
-- DESTRUCTIVE: drops every business table. Valid only while the database holds no business data
-- (development, CI, or a staging database being rebuilt). Once real data exists, mistakes are
-- fixed with a reviewed forward migration, never with this script (docs/PHASE_02.md §5).
--
-- Run as the migration owner:  psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0000_0001_down.sql

BEGIN;

DROP SCHEMA IF EXISTS app CASCADE;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['alstore_app', 'alstore_readonly', 'alstore_migrator'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('DROP OWNED BY %I', r);
      BEGIN
        EXECUTE format('DROP ROLE %I', r);
      EXCEPTION WHEN dependent_objects_still_exist THEN
        -- Roles are cluster-wide; another database on this server still uses it.
        RAISE NOTICE 'role % kept: still referenced in another database', r;
      END;
    END IF;
  END LOOP;
END
$$;

COMMIT;
