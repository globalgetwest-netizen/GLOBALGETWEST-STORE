#!/bin/bash
# Applies schema.sql + every migration to a THROWAWAY local Postgres (never
# the live project) with a minimal Supabase stand-in, then runs the
# migration-017 security tests. Usage:
#   PGHOST=localhost PGPORT=54329 PGUSER=postgres ./supabase/tests/run_017_tests.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; SB="$HERE/.."; DB=ggw_records_test
q() { psql -q -v ON_ERROR_STOP=1 "$@"; }
psql -q -c "drop database if exists $DB" -c "create database $DB"
q -d $DB -f "$HERE/supabase_stub.sql" -f "$SB/schema.sql"
for f in "$SB"/migrations/00{2,3,4,5}*.sql; do q -d $DB -f "$f"; done
# 006 must run in two steps (see docs/PHASE-6-README.md)
q -d $DB -c "alter type user_role add value if not exists 'ceo'"
sed '/^alter type user_role add value/d' "$SB/migrations/006_ceo_and_country_scoping.sql" | q -d $DB
for f in "$SB"/migrations/0{07,08,09,10,11,12,13,14,15,16}*.sql; do q -d $DB -f "$f"; done
q -d $DB --single-transaction -f "$SB/migrations/017_patient_records.sql"
echo "017 applied in a single transaction"
psql -q -d $DB -f "$HERE/017_patient_records_test.sql" | grep -E "FAIL|passed|^ +[0-9]+ \| +[0-9]+"
