#!/usr/bin/env bash
# QA Phase 00 — negative tests for scripts/verify-phase-00.mjs.
# Usage: verify-negative-tests.sh <path-to-repo-snapshot> <scratch-dir>
# Each case copies the snapshot into a fresh git repo, seeds ONE defect, runs `node scripts/verify-phase-00.mjs --scope`
# and prints the real exit code. "expect=1" means a correct detector must FAIL.
# The banned secondary-location name and the fake secret are assembled at runtime and never written literally in this file.
set -u
SRC=${1:?snapshot path}; S=${2:?scratch dir}
B=$(printf 'dep%s bab%s' o i)
T=$(printf 'sb_%s_%s' secret ABCDEFGHIJKLMNOP1234)   # fake token, assembled at runtime so this file never matches a secret scanner
rm -rf "$S"; mkdir -p "$S"
cp -a "$SRC" "$S/base"; (cd "$S/base" && git init -q && printf 'SUPABASE_SECRET_KEY=dummy-not-a-secret\n' > .env)
(cd "$S/base" && node scripts/verify-phase-00.mjs --scope >/dev/null 2>&1; echo "[BASELINE --scope] expect=0 exit=$?")
(cd "$S/base" && node scripts/verify-phase-00.mjs >/dev/null 2>&1; echo "[BASELINE no-scope] expect=0 exit=$?")
run() { local name=$1 expect=$2 setup=$3 d="$S/$1"; cp -a "$S/base" "$d"; (cd "$d" && eval "$setup")
  # output is written OUTSIDE the seeded repo ($d.out) so it cannot itself trip the --scope allowlist
  (cd "$d" && node scripts/verify-phase-00.mjs --scope >"$d.out" 2>&1; c=$?
   v=$([ "$c" = "$expect" ] && echo OK || echo DETECTOR-GAP)
   n=$(grep -c '^  FAIL' "$d.out"); echo "[$name] expect=$expect exit=$c $v fails=$n :: $(grep '^  FAIL' "$d.out" | head -2 | sed -E 's/^  FAIL //' | tr '\n' '|' | cut -c1-150)") ; }
run N1_banned_term_in_doc          1 "echo \"Stock at $B\" >> docs/SCOPE.md"
run N2_secret_in_shell_script      1 "mkdir -p deploy && echo \"export K=$T\" > deploy/run.sh"
run N3_secret_in_Dockerfile        1 "echo \"ENV SUPABASE_SECRET_KEY=$T\" > Dockerfile"
run N4_secret_in_csv               1 "mkdir -p data && echo \"k,$T\" > data/keys.csv"
run N5_banned_term_in_import_csv   1 "mkdir -p data && printf 'sku,location\nAL-01,%s\n' \"$B\" > data/products.csv"
run N6_business_code_in_lib        1 "mkdir -p lib && echo 'export function issueInvoice(){}' > lib/invoice.ts"
run N7_sql_migration_in_db_dir     1 "mkdir -p db && echo 'CREATE TABLE tax_invoices(id int);' > db/0001_init.sql"
run N8_pages_router_code           1 "mkdir -p pages && echo 'export default function P(){return null}' > pages/index.tsx"
run N9_architecture_lock_drift     1 "echo 'Prisma is now allowed.' >> docs/ARCHITECTURE_LOCK.md"
run N10_env_not_ignored            1 "sed -i 's#^\.env\$##; s#^\.env\.\*\$##' .gitignore"
run N11_undefined_gate_reference   1 "echo 'See VG-99.' >> docs/SCOPE.md"
run N12_quoted_secret_in_example   1 "echo 'SUPABASE_SECRET_KEY=\"realvalue123\"' >> .env.example"
run N13_code_in_src                1 "mkdir -p src && echo 'export const a=1' > src/a.ts"
run N14_not_a_git_repo             1 "rm -rf .git"
