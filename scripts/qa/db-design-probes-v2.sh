#!/usr/bin/env bash
# QA Phase 00 re-review — probes of the REMEDIATED transaction design (DATABASE_TRANSACTION_BOUNDARIES after QA00-01/04/07/08)
# against a throw-away PostgreSQL 16 cluster with synthetic rows. Usage (root, PG16 server binaries): db-design-probes-v2.sh <scratch-dir>
set -u
S=${1:?scratch dir}; BIN=/usr/lib/postgresql/16/bin; PORT=55434
rm -rf "$S"; mkdir -p "$S"; chown postgres "$S"
su postgres -s /bin/bash -c "test -w $S" || { echo "BLOCKED: $S not reachable by the postgres OS user"; exit 2; }
su postgres -s /bin/bash -c "$BIN/initdb -D $S/data -A trust -U postgres >/dev/null && $BIN/pg_ctl -D $S/data -o '-p $PORT -k $S -c listen_addresses=' -l $S/log -w start >/dev/null" || { echo "BLOCKED: cluster did not start"; exit 2; }
SU="psql -h $S -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"
APP="psql -h $S -p $PORT -U alstore_app -d probe -X -q -tA"
$SU <<'SQL'
CREATE DATABASE probe;
\c probe
CREATE ROLE alstore_app LOGIN; CREATE SCHEMA app; GRANT USAGE ON SCHEMA app TO alstore_app;
CREATE FUNCTION app.reject_change() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'immutable'; END$$;
CREATE TABLE app.tax_invoices(id int PRIMARY KEY, gross numeric(18,2) NOT NULL);
CREATE TRIGGER imm BEFORE UPDATE OR DELETE ON app.tax_invoices FOR EACH ROW EXECUTE FUNCTION app.reject_change();
GRANT SELECT, INSERT ON app.tax_invoices TO alstore_app;
CREATE TABLE app.settlement_targets(target_type text, target_id int, created_at timestamptz DEFAULT now(), PRIMARY KEY(target_type, target_id));
GRANT SELECT, INSERT, UPDATE ON app.settlement_targets TO alstore_app;
CREATE TABLE app.allocations(id serial PRIMARY KEY, invoice_id int, amount numeric(18,2));
CREATE TABLE app.credits(id serial PRIMARY KEY, invoice_id int, amount numeric(18,2));
CREATE TABLE app.stock_balances(product_id int PRIMARY KEY, on_hand numeric(18,3) NOT NULL CHECK (on_hand >= 0));
CREATE TABLE app.tax_periods(id int PRIMARY KEY, status text);
GRANT ALL ON app.allocations, app.credits, app.stock_balances, app.tax_periods TO alstore_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app TO alstore_app;
-- outstanding per DOMAIN_MODEL §3.9 (no debits in this probe)
CREATE FUNCTION app.outstanding(inv int) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT i.gross - coalesce((SELECT sum(amount) FROM app.credits c WHERE c.invoice_id=inv),0)
                 - coalesce((SELECT sum(amount) FROM app.allocations a WHERE a.invoice_id=inv),0)
  FROM app.tax_invoices i WHERE i.id=inv $$;
GRANT EXECUTE ON FUNCTION app.outstanding(int) TO alstore_app;
-- two invoices of 200.00 EUR, each with its settlement_targets row (CMD-02 step 12)
INSERT INTO app.tax_invoices VALUES (1,200.00),(2,200.00);
INSERT INTO app.settlement_targets(target_type,target_id) VALUES ('TAX_INVOICE',1),('TAX_INVOICE',2);
SQL
r() { echo "$1"; }
out=$($APP -c "BEGIN; SELECT 'locked '||target_id FROM app.settlement_targets WHERE target_type='TAX_INVOICE' AND target_id=1 FOR UPDATE; ROLLBACK;" 2>&1); echo "R1a lock settlement_targets row as app role -> exit=$? ${out//$'\n'/ }"
out=$($APP -c "UPDATE app.tax_invoices SET gross=1 WHERE id=1" 2>&1); echo "R1b issued invoice still not updatable -> exit=$? ${out//$'\n'/ }"

# R2: F-19 — allocation of 200 (session A) concurrent with a credit note of 50 (session B) on the same invoice.
ALLOC="BEGIN; SELECT 1 FROM app.settlement_targets WHERE target_type='TAX_INVOICE' AND target_id=\$INV FOR UPDATE;
 DO \$\$BEGIN IF app.outstanding(\$INV) < 200 THEN RAISE EXCEPTION 'ALLOCATION_EXCEEDS_OUTSTANDING'; END IF; END\$\$;
 SELECT pg_sleep(2); INSERT INTO app.allocations(invoice_id,amount) VALUES (\$INV,200); COMMIT;"
CREDIT="BEGIN; SELECT 1 FROM app.settlement_targets WHERE target_type='TAX_INVOICE' AND target_id=\$INV FOR UPDATE;
 DO \$\$BEGIN IF app.outstanding(\$INV) - 50 < 0 THEN RAISE EXCEPTION 'CREDIT_EXCEEDS_OUTSTANDING (no excess_action)'; END IF; END\$\$;
 INSERT INTO app.credits(invoice_id,amount) VALUES (\$INV,50); COMMIT;"
NOLOCK_ALLOC="BEGIN; DO \$\$BEGIN IF app.outstanding(2) < 200 THEN RAISE EXCEPTION 'x'; END IF; END\$\$; SELECT pg_sleep(2); INSERT INTO app.allocations(invoice_id,amount) VALUES (2,200); COMMIT;"
NOLOCK_CREDIT="BEGIN; DO \$\$BEGIN IF app.outstanding(2) - 50 < 0 THEN RAISE EXCEPTION 'CREDIT_EXCEEDS_OUTSTANDING'; END IF; END\$\$; INSERT INTO app.credits(invoice_id,amount) VALUES (2,50); COMMIT;"
( $APP -c "${ALLOC//\$INV/1}" > $S/r2a.txt 2>&1 ) & sleep 0.5
outB=$($APP -c "${CREDIT//\$INV/1}" 2>&1 | grep -oE 'ERROR: +[A-Z_]+' ); wait
echo "R2a WITH settlement lock: credit B -> ${outB:-committed}; outstanding(inv1)=$($APP -c 'SELECT app.outstanding(1)')"
( $APP -c "$NOLOCK_ALLOC" > $S/r2c.txt 2>&1 ) & sleep 0.5
outB=$($APP -c "$NOLOCK_CREDIT" 2>&1 | grep -oE 'ERROR: +[A-Z_]+' ); wait
echo "R2b control WITHOUT lock: credit B -> ${outB:-committed}; outstanding(inv2)=$($APP -c 'SELECT app.outstanding(2)')  (negative = the race the lock prevents)"

# R3: balance row pre-created at product creation (QA00-07): two concurrent first receipts.
$APP -c "INSERT INTO app.stock_balances VALUES (7, 0.000)"
REC="BEGIN; SELECT on_hand FROM app.stock_balances WHERE product_id=7 FOR UPDATE; UPDATE app.stock_balances SET on_hand=on_hand+\$Q WHERE product_id=7; SELECT pg_sleep(1); COMMIT;"
( $APP -c "${REC//\$Q/5.000}" > $S/r3a.txt 2>&1; echo "A exit=$?" >> $S/r3a.txt ) & sleep 0.3
$APP -c "${REC//\$Q/3.000}" > $S/r3b.txt 2>&1; eb=$?; wait
echo "R3  two first receipts (5.000 + 3.000): A $(grep -o 'exit=[0-9]' $S/r3a.txt), B exit=$eb, errors=$(cat $S/r3a.txt $S/r3b.txt | grep -c ERROR), on_hand=$($APP -c 'SELECT on_hand FROM app.stock_balances WHERE product_id=7')"

# R4: period not OPEN -> both postings take FOR UPDATE directly (no SHARE->UPDATE upgrade)
$APP -c "INSERT INTO app.tax_periods VALUES (1,'ACCOUNTANT_REVIEWED')"
POST="BEGIN; SELECT status FROM app.tax_periods WHERE id=1; SELECT id FROM app.tax_periods WHERE id=1 FOR UPDATE; SELECT pg_sleep(1); UPDATE app.tax_periods SET status='OPEN' WHERE id=1; COMMIT;"
( $APP -c "$POST" > $S/r4a.txt 2>&1; echo "exit=$?" >> $S/r4a.txt ) & sleep 0.3
$APP -c "$POST" > $S/r4b.txt 2>&1; eb=$?; wait
echo "R4  two invalidating postings, direct FOR UPDATE: A $(grep -o 'exit=[0-9]' $S/r4a.txt), B exit=$eb, deadlocks=$(cat $S/r4a.txt $S/r4b.txt | grep -c 'deadlock')"

# R5: unlocked read says OPEN, a transition to READY commits before FOR SHARE is granted; what does the re-check see?
$APP -c "UPDATE app.tax_periods SET status='OPEN' WHERE id=1"
( $APP -c "BEGIN; SELECT id FROM app.tax_periods WHERE id=1 FOR UPDATE; SELECT pg_sleep(1.5); UPDATE app.tax_periods SET status='READY_FOR_ACCOUNTANT_REVIEW' WHERE id=1; COMMIT;" >/dev/null 2>&1 ) & sleep 0.3
out=$($APP -c "BEGIN; SELECT 'unlocked read: '||status FROM app.tax_periods WHERE id=1; SELECT 're-check under FOR SHARE: '||status FROM app.tax_periods WHERE id=1 FOR SHARE; ROLLBACK;" 2>&1); wait
echo "R5  ${out//$'\n'/ ; }"
su postgres -s /bin/bash -c "$BIN/pg_ctl -D $S/data -m fast stop >/dev/null"; echo "cluster stopped"
