#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
parser="${script_dir}/prepare-aca-secret-references.sh"
output_file="${script_dir}/.prepare-aca-secret-references.test-output.$$"
log_file="${script_dir}/.prepare-aca-secret-references.test-log.$$"
trap 'rm -f "${output_file}" "${log_file}"' EXIT

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

run_parser() {
  : > "${output_file}"
  : > "${log_file}"
  SECRET_ENV_VARS="$1" GITHUB_OUTPUT="${output_file}" bash "${parser}" > "${log_file}" 2>&1
}

run_parser "NEXTAUTH_SECRET=nextauth-value GOOGLE_CLIENT_ID=google-id ADMIN_EMAILS= GITHUB_APP_PRIVATE_KEY_BASE64=base64-value"

grep -Fqx \
  "set_secrets_args=nextauth-secret=nextauth-value google-client-id=google-id github-app-private-key-base64=base64-value" \
  "${output_file}" || fail "configured secrets were not prepared correctly"
grep -Fqx \
  "set_secret_env_args=NEXTAUTH_SECRET=secretref:nextauth-secret GOOGLE_CLIENT_ID=secretref:google-client-id GITHUB_APP_PRIVATE_KEY_BASE64=secretref:github-app-private-key-base64" \
  "${output_file}" || fail "secret environment references were not prepared correctly"
grep -Fqx \
  "[WARN] Optional secret ADMIN_EMAILS is not configured; omitting it." \
  "${log_file}" || fail "empty optional secret warning was not emitted"
if grep -Fq "ADMIN_EMAILS=" "${output_file}"; then
  fail "empty optional secret was included in outputs"
fi

run_parser ""
grep -Fqx "set_secrets_args=" "${output_file}" || fail "empty input did not produce empty secret arguments"
grep -Fqx "set_secret_env_args=" "${output_file}" || fail "empty input did not produce empty environment arguments"

for invalid_input in "=value" "INVALID-KEY=value" "MISSING_EQUALS"; do
  if run_parser "${invalid_input}"; then
    fail "invalid KEY was accepted"
  fi
  grep -Fqx \
    "[ERROR] Secret environment entry has an empty or invalid KEY." \
    "${log_file}" ||
    grep -Fqx \
      "[ERROR] Secret environment entries must use KEY=VALUE." \
      "${log_file}" ||
    fail "invalid KEY error was not emitted"
done

echo "[PASS] ACA secret reference parser tests passed."
