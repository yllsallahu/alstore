#!/usr/bin/env bash
# QA Phase 00 — probes of the transaction design in docs/DATABASE_TRANSACTION_BOUNDARIES.md against a real,
# throw-away PostgreSQL 16 cluster (synthetic data only). Not application tests: Phase 00 has no code.
# Usage (as root, PostgreSQL 16 server binaries installed): db-design-probes.sh <scratch-dir>
set -u
S=${1:?scratch dir}; BIN=/usr/lib/postgresql/16/bin; PORT=55433
rm -rf "$S"; mkdir -p "$S"; chown postgres "$S"
su postgres -s /bin/bash -c "test -w $S" || { echo "BLOCKED: $S not reachable by the postgres OS user (make its parents traversable)"; exit 2; }
su postgres -s /bin/bash -c "$BIN/initdb -D $S/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $S/data -o '-p $PORT -k $S -c listen_addresses=' -l $S/log -w start >/dev/null" || { echo "BLOCKED: cluster did not start"; exit 2; }
SU="psql -h $S -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"
APP="psql -h $S -p $PORT -U alstore_app -d probe -X -q -tA"
$SU <<'SQL'
CREATE DATABASE probe;
\c probe
CREATE ROLE alstore_app LOGIN;
CREATE SCHEMA app; GRANT USAGE ON SCHEMA app TO alstore_app;
CREATE FUNCTION app.reject_change() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'immutable'; END$$;
-- (1) issued invoice: append-only trigger + UPDATE/DELETE not granted, as DATABASE_TRANSACTION_BOUNDARIES §7 prescribes
CREATE TABLE app.tax_invoices(id int PRIMARY KEY, gross numeric(18,2) NOT NULL);
CREATE TRIGGER imm BEFORE UPDATE OR DELETE ON app.tax_invoices FOR EACH ROW EXECUTE FUNCTION app.reject_change();
GRANT SELECT, INSERT ON app.tax_invoices TO alstore_app; INSERT INTO app.tax_invoices VALUES (1, 200.00);
-- (1b) remedy variant: separate mutable lock row per settlement target
CREATE TABLE app.settlement_targets(target_type text, target_id int, PRIMARY KEY(target_type, target_id));
GRANT SELECT, INSERT, UPDATE ON app.settlement_targets TO alstore_app; INSERT INTO app.settlement_targets VALUES ('TAX_INVOICE',1);
CREATE TABLE app.idempotency_keys(org_id int, actor_id int, key uuid, status text, PRIMARY KEY(org_id, actor_id, key));
CREATE TABLE app.invoice_series(id int PRIMARY KEY, next_number int NOT NULL); INSERT INTO app.invoice_series VALUES (1, 151);
CREATE TABLE app.stock_balances(product_id int PRIMARY KEY, on_hand numeric(18,3) NOT NULL CHECK (on_hand >= 0));
CREATE TABLE app.tax_periods(id int PRIMARY KEY, status text); INSERT INTO app.tax_periods VALUES (1,'ACCOUNTANT_REVIEWED');
GRANT ALL ON app.idempotency_keys, app.invoice_series, app.stock_balances, app.tax_periods TO alstore_app;
SQL
echo "P1  row lock on immutable tax_invoices (UPDATE not granted), as app role:"
for m in "FOR UPDATE" "FOR NO KEY UPDATE" "FOR SHARE" "FOR KEY SHARE"; do
  out=$($APP -c "BEGIN; SELECT id FROM app.tax_invoices WHERE id=1 $m; ROLLBACK;" 2>&1); echo "    $m -> exit=$? ${out//$'\n'/ }"; done
out=$($APP -c "BEGIN; SELECT target_id FROM app.settlement_targets WHERE target_type='TAX_INVOICE' AND target_id=1 FOR UPDATE; ROLLBACK;" 2>&1); echo "P1b lock via separate settlement_targets row -> exit=$? ${out//$'\n'/ }"
K=11111111-1111-1111-1111-111111111111; K2=22222222-2222-2222-2222-222222222222
( $APP -c "BEGIN; INSERT INTO app.idempotency_keys VALUES (1,1,'$K','IN_PROGRESS'); SELECT pg_sleep(2); UPDATE app.idempotency_keys SET status='COMPLETED' WHERE key='$K'; COMMIT;" >/dev/null ) & sleep 0.5
out=$($APP -c "BEGIN; INSERT INTO app.idempotency_keys VALUES (1,1,'$K','IN_PROGRESS') ON CONFLICT DO NOTHING RETURNING 'claimed'; SELECT 'existing='||status FROM app.idempotency_keys WHERE key='$K'; ROLLBACK;" 2>&1); wait
echo "P2a duplicate key, first txn COMMITS  -> second waits, claims nothing: ${out//$'\n'/ }"
( $APP -c "BEGIN; INSERT INTO app.idempotency_keys VALUES (1,1,'$K2','IN_PROGRESS'); SELECT pg_sleep(2); ROLLBACK;" >/dev/null ) & sleep 0.5
out=$($APP -c "BEGIN; INSERT INTO app.idempotency_keys VALUES (1,1,'$K2','IN_PROGRESS') ON CONFLICT DO NOTHING RETURNING 'claimed'; ROLLBACK;" 2>&1); wait
echo "P2b duplicate key, first txn ROLLS BACK -> second claims: ${out//$'\n'/ }"
out=$($APP -c "BEGIN; UPDATE app.invoice_series SET next_number=next_number+1 WHERE id=1; ROLLBACK;" -c "SELECT 'next_number='||next_number FROM app.invoice_series" 2>&1)
echo "P3  counter after rolled-back issuance (was 151): ${out//$'\n'/ }"
( $APP -c "BEGIN; SELECT count(*) FROM (SELECT 1 FROM app.stock_balances WHERE product_id=7 FOR UPDATE) s; INSERT INTO app.stock_balances VALUES (7,5.000); SELECT pg_sleep(2); COMMIT;" >/dev/null ) & sleep 0.5
out=$($APP -c "\set VERBOSITY verbose" -c "BEGIN; SELECT 'rows_locked='||count(*) FROM (SELECT 1 FROM app.stock_balances WHERE product_id=7 FOR UPDATE) s; INSERT INTO app.stock_balances VALUES (7,3.000); COMMIT;" 2>&1 | grep -E 'rows_locked|ERROR'); wait
echo "P4  two first receipts for a SKU without a balance row: ${out//$'\n'/ }"
( $APP -c "BEGIN; SELECT status FROM app.tax_periods WHERE id=1 FOR SHARE; SELECT pg_sleep(1); SELECT id FROM app.tax_periods WHERE id=1 FOR UPDATE; COMMIT;" > $S/p5a.txt 2>&1 ) & sleep 0.3
$APP -c "BEGIN; SELECT status FROM app.tax_periods WHERE id=1 FOR SHARE; SELECT pg_sleep(1); SELECT id FROM app.tax_periods WHERE id=1 FOR UPDATE; COMMIT;" > $S/p5b.txt 2>&1; wait
echo "P5  FOR SHARE -> FOR UPDATE upgrade on tax_periods by two postings: $(cat $S/p5a.txt $S/p5b.txt | grep -oE 'ERROR: +deadlock detected' | head -1 || true)"
su postgres -s /bin/bash -c "$BIN/pg_ctl -D $S/data -m fast stop >/dev/null"; echo "cluster stopped"
