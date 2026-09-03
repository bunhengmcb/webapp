#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_dir}"

config="wrangler.staging.jsonc"
worker_name="mcb-inventory-v96-rc4-staging"
database_name="mcb-inventory-v96-rc4-staging-db"
bucket_name="mcb-inventory-v96-rc4-staging-r2"

if [[ ! -f "${config}" ]]; then
  echo "Missing ${config}." >&2
  exit 66
fi

if grep -Eq 'routes|custom_domain|mcb-inventory-mvp' "${config}"; then
  echo "Safety stop: staging config contains a production-like route or name." >&2
  exit 65
fi

echo "Verifying Cloudflare authentication..."
npx wrangler whoami

echo "Running V96 RC5 release gates..."
npm run build
node --test tests/rendered-html.test.mjs
node tests/v96-static-gates.mjs
node tests/standalone-auth-gates.mjs
node tests/rc5-hardening-gates.mjs
npx tsc --noEmit
npm run lint

if ! npx wrangler secret list --config "${config}" | grep -q 'BOOTSTRAP_REGISTRATION_TOKEN'; then
  echo "Safety stop: BOOTSTRAP_REGISTRATION_TOKEN is not configured for staging." >&2
  echo "Run: npx wrangler secret put BOOTSTRAP_REGISTRATION_TOKEN --config ${config}" >&2
  exit 72
fi

if ! grep -Eq '"binding"[[:space:]]*:[[:space:]]*"DB"' "${config}"; then
  echo "Creating isolated staging D1 database..."
  npx wrangler d1 create "${database_name}" \
    --location apac \
    --config "${config}" \
    --binding DB \
    --update-config
fi

if ! grep -Eq '"binding"[[:space:]]*:[[:space:]]*"BUCKET"' "${config}"; then
  echo "Creating isolated staging R2 bucket..."
  npx wrangler r2 bucket create "${bucket_name}" \
    --location apac \
    --config "${config}" \
    --binding BUCKET \
    --update-config
fi

mkdir -p migrations
cp -f drizzle/0000_production_foundation.sql migrations/
cp -f drizzle/0001_user_registration.sql migrations/
cp -f drizzle/0002_login_history.sql migrations/
cp -f drizzle/0003_staff_display_name.sql migrations/

echo "Listing the five approved schema migrations..."
npx wrangler d1 migrations list DB --remote --config "${config}"

echo "Applying schema migrations 0000-0004 only."
echo "Opening Stock and BOM data migrations are intentionally excluded."
npx wrangler d1 migrations apply DB --remote --config "${config}"

echo "Deploying isolated staging Worker only..."
deploy_output="$(npx wrangler deploy --config "${config}" --strict \
  --message "MCB Inventory System V96 RC5 isolated staging")"
printf '%s\n' "${deploy_output}"

staging_url="$(printf '%s\n' "${deploy_output}" | grep -Eo 'https://[^[:space:]]+\.workers\.dev' | tail -n 1)"
if [[ -z "${staging_url}" ]]; then
  echo "Deployment returned no workers.dev URL; stopping before claiming success." >&2
  exit 70
fi

echo "Verifying staging HTTP response..."
http_code="$(curl --silent --show-error --location --output /tmp/mcb-v96-staging-response.html \
  --write-out '%{http_code}' "${staging_url}")"
if [[ "${http_code}" -lt 200 || "${http_code}" -ge 400 ]]; then
  echo "Staging URL failed verification with HTTP ${http_code}: ${staging_url}" >&2
  exit 71
fi

echo "Verifying RC5 staging security headers and health..."
headers_file="$(mktemp)"
trap 'rm -f -- "${headers_file}"' EXIT
curl --silent --show-error --dump-header "${headers_file}" --output /dev/null "${staging_url}/login"
for expected_header in \
  'x-content-type-options: nosniff' \
  'x-frame-options: DENY' \
  'referrer-policy: strict-origin-when-cross-origin' \
  "content-security-policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'"; do
  if ! tr -d '\r' < "${headers_file}" | grep -Fqi "${expected_header}"; then
    echo "Staging response is missing security header: ${expected_header}" >&2
    exit 73
  fi
done
health_code="$(curl --silent --show-error --output /tmp/mcb-v96-staging-health.json \
  --write-out '%{http_code}' "${staging_url}/api/system/health")"
if [[ "${health_code}" != "200" ]]; then
  echo "Staging health check failed with HTTP ${health_code}." >&2
  exit 74
fi
unauth_state_code="$(curl --silent --show-error --output /tmp/mcb-v96-staging-unauth.json \
  --write-out '%{http_code}' "${staging_url}/api/state")"
if [[ "${unauth_state_code}" != "401" ]]; then
  echo "Unauthenticated state check failed: expected 401, got ${unauth_state_code}." >&2
  exit 75
fi
spoof_state_code="$(curl --silent --show-error --output /tmp/mcb-v96-staging-spoof.json \
  --write-out '%{http_code}' \
  -H 'oai-authenticated-user-id: spoofed' \
  -H 'oai-authenticated-user-email: attacker@example.com' \
  "${staging_url}/api/state")"
if [[ "${spoof_state_code}" != "401" ]]; then
  echo "Legacy identity-header spoof check failed: expected 401, got ${spoof_state_code}." >&2
  exit 76
fi

echo "Verifying D1 schema and migration journal..."
npx wrangler d1 execute DB --remote --config "${config}" \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('app_state','users','audit_logs','registration_profiles','login_history','auth_credentials','auth_sessions','login_attempts','security_events','auth_bootstrap','d1_migrations') ORDER BY name;"
npx wrangler d1 execute DB --remote --config "${config}" \
  --command "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;"

echo "STAGING_WORKER=${worker_name}"
echo "STAGING_D1=${database_name}"
echo "STAGING_R2=${bucket_name}"
echo "STAGING_URL=${staging_url}"
echo "STAGING_HTTP=${http_code}"
echo "STAGING_HEALTH=${health_code}"
echo "STAGING_UNAUTH_STATE=${unauth_state_code}"
echo "STAGING_SPOOF_STATE=${spoof_state_code}"
echo "Run scripts/smoke-v96-auth-staging.sh ${staging_url} after controlled Developer registration."
echo "Run scripts/drill-staging-backup-restore.sh to complete the backup/restore release gate."
