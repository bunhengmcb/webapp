#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_dir}"

config="wrangler.staging.jsonc"
backup_dir="${project_dir}/backups/staging"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/mcb-v96-rc5-staging-${timestamp}.sql"
restore_dir="$(mktemp -d)"
trap 'rm -rf -- "${restore_dir}"' EXIT

if grep -Eq 'routes|custom_domain|mcb-inventory-mvp' "${config}"; then
  echo "Safety stop: staging config contains a production-like route or name." >&2
  exit 65
fi

mkdir -p "${backup_dir}"
echo "Exporting the isolated staging D1 database..."
npx wrangler d1 export DB --remote --config "${config}" --output "${backup_file}"
test -s "${backup_file}"

restore_db="${restore_dir}/restored.sqlite3"
if command -v python3 >/dev/null 2>&1; then
  python_cmd=(python3)
elif command -v python >/dev/null 2>&1; then
  python_cmd=(python)
elif command -v py >/dev/null 2>&1; then
  python_cmd=(py -3)
else
  echo "Python 3 is required for the isolated restore verification." >&2
  exit 69
fi

echo "Restoring the staging export with Python's isolated SQLite engine..."
"${python_cmd[@]}" -c '
import sqlite3, sys
sql_path, db_path = sys.argv[1:3]
with open(sql_path, "r", encoding="utf-8") as source:
    sql = source.read()
db = sqlite3.connect(db_path)
try:
    db.executescript(sql)
    db.commit()
finally:
    db.close()
' "${backup_file}" "${restore_db}"

count_query="SELECT 'app_state' AS table_name, COUNT(*) AS row_count FROM app_state UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs UNION ALL SELECT 'registration_profiles', COUNT(*) FROM registration_profiles UNION ALL SELECT 'login_history', COUNT(*) FROM login_history UNION ALL SELECT 'auth_credentials', COUNT(*) FROM auth_credentials UNION ALL SELECT 'auth_sessions', COUNT(*) FROM auth_sessions ORDER BY table_name;"

canonical_rows() {
  node -e '
    let input = "";
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      const value = JSON.parse(input);
      const entries = Array.isArray(value) ? value : [value];
      const rows = entries.flatMap(entry => entry?.results ?? []);
      rows.sort((a, b) => String(a.table_name).localeCompare(String(b.table_name)));
      process.stdout.write(JSON.stringify(rows));
    });
  '
}

remote_counts="$(npx wrangler d1 execute DB --remote --config "${config}" --command "${count_query}" --json | canonical_rows)"
restored_counts="$("${python_cmd[@]}" -c '
import json, sqlite3, sys
tables = ["app_state", "audit_logs", "auth_credentials", "auth_sessions", "login_history", "registration_profiles", "users"]
db = sqlite3.connect(sys.argv[1])
try:
    rows = [{"table_name": table, "row_count": db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]} for table in tables]
    print(json.dumps(rows, separators=(",", ":")), end="")
finally:
    db.close()
' "${restore_db}")"

if [[ "${remote_counts}" != "${restored_counts}" ]]; then
  echo "Backup/restore row-count comparison failed." >&2
  echo "REMOTE=${remote_counts}" >&2
  echo "RESTORED=${restored_counts}" >&2
  exit 77
fi

quick_check="$("${python_cmd[@]}" -c '
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
try:
    print(db.execute("PRAGMA quick_check").fetchone()[0], end="")
finally:
    db.close()
' "${restore_db}")"
if [[ "${quick_check}" != "ok" ]]; then
  echo "Restored database integrity check failed: ${quick_check}" >&2
  exit 78
fi

backup_sha256="$(sha256sum "${backup_file}" | awk '{print $1}')"
echo "BACKUP_RESTORE_DRILL=PASS"
echo "BACKUP_FILE=${backup_file}"
echo "BACKUP_SHA256=${backup_sha256}"
echo "RESTORED_COUNTS=${restored_counts}"
