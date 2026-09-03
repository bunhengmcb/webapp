#!/usr/bin/env bash
set -euo pipefail

staging_url="${1:-https://mcb-inventory-v96-rc4-staging.bunhengmcb.workers.dev}"
origin="${staging_url%/}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "${tmp_dir}"' EXIT
cookie_jar="${tmp_dir}/cookies.txt"

status() {
  curl --silent --show-error --output "$2" --write-out '%{http_code}' "${@:3}"
}

expect_code() {
  local label="$1" expected="$2" actual="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "FAIL ${label}: expected HTTP ${expected}, got ${actual}" >&2
    exit 1
  fi
  echo "PASS ${label}: HTTP ${actual}"
}

login_page_code="$(status login_page "${tmp_dir}/login.html" "${origin}/login")"
expect_code "login page" 200 "${login_page_code}"

unauth_code="$(status unauth_state "${tmp_dir}/unauth.json" "${origin}/api/state")"
expect_code "unauthenticated /api/state rejection" 401 "${unauth_code}"

spoof_code="$(status spoof_state "${tmp_dir}/spoof.json" \
  -H 'oai-authenticated-user-id: spoofed' \
  -H 'oai-authenticated-user-email: attacker@example.com' \
  -H 'oai-authenticated-user-name: Spoofed Developer' \
  "${origin}/api/state")"
expect_code "legacy identity-header spoof rejection" 401 "${spoof_code}"

read -r -p "Developer username: " username
read -r -s -p "Developer password: " password
printf '\n'
login_payload="$(printf '%s\n%s\n' "${username}" "${password}" | node -e '
  let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => {
    const [username, password] = data.replace(/\n$/, "").split("\n");
    process.stdout.write(JSON.stringify({ username, password, remember: false }));
  });
')"
unset password

login_code="$(status login "${tmp_dir}/login.json" \
  --cookie-jar "${cookie_jar}" \
  -H "Origin: ${origin}" \
  -H 'Content-Type: application/json' \
  --data "${login_payload}" \
  "${origin}/api/auth/login")"
unset login_payload
expect_code "authenticated login" 200 "${login_code}"

state_code="$(status authenticated_state "${tmp_dir}/state.json" --cookie "${cookie_jar}" "${origin}/api/state")"
expect_code "authenticated identity reaches backend" 200 "${state_code}"

refresh_code="$(status refresh_state "${tmp_dir}/refresh.json" --cookie "${cookie_jar}" "${origin}/api/state")"
expect_code "D1 state survives refresh" 200 "${refresh_code}"

logout_code="$(status logout "${tmp_dir}/logout.json" \
  --cookie "${cookie_jar}" --cookie-jar "${cookie_jar}" \
  -H "Origin: ${origin}" -X POST "${origin}/api/auth/logout")"
expect_code "logout" 200 "${logout_code}"

logged_out_code="$(status logged_out_state "${tmp_dir}/logged-out.json" --cookie "${cookie_jar}" "${origin}/api/state")"
expect_code "logged-out session rejection" 401 "${logged_out_code}"

echo "Re-run this script and sign in again to complete the re-login persistence check."
echo "STAGING_AUTH_SMOKE=PASS"
