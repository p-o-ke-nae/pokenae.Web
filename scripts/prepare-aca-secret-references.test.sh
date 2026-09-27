#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
parser="${script_dir}/prepare-aca-secret-references.sh"
output_file="${script_dir}/.prepare-aca-secret-references.test-output.$$"
log_file="${script_dir}/.prepare-aca-secret-references.test-log.$$"
trap 'rm -f "${output_file}" "${log_file}"' EXIT

fail() {
  printf '[FAIL] %s\n' "$*" >&2
  exit 1
}

run_parser() {
  : > "${output_file}"
  : > "${log_file}"
  SECRET_ENV_VARS="$1" PARSER="${parser}" bash -c '
    source "${PARSER}"
    prepare_aca_secret_references "${SECRET_ENV_VARS}"
    printf "%s\n" "${ACA_SECRET_ARGS[@]}"
    printf "%s\n" "${ACA_SECRET_ENV_ARGS[@]}"
  ' > "${output_file}" 2> "${log_file}"
}

valid_input='NEXTAUTH_SECRET=nextauth-secret-marker
GOOGLE_CLIENT_ID=google-id
GOOGLE_CLIENT_SECRET=google-secret
ADMIN_EMAILS=first@example.com, second@example.com
GITHUB_APP_ID=
GITHUB_APP_INSTALLATION_ID=
GITHUB_APP_PRIVATE_KEY_BASE64='
run_parser "${valid_input}"

grep -Fqx "admin-emails=first@example.com, second@example.com" "${output_file}" ||
  fail "ADMIN_EMAILS whitespace was not preserved"
grep -Fqx "github-app-id=0" "${output_file}" ||
  fail "empty optional ID was not disabled"
grep -Fqx "github-app-installation-id=0" "${output_file}" ||
  fail "empty optional installation ID was not disabled"
grep -Fqx "github-app-private-key-base64=ZGlzYWJsZWQ=" "${output_file}" ||
  fail "empty optional private key was not disabled"
grep -Fqx "GITHUB_APP_ID=secretref:github-app-id" "${output_file}" ||
  fail "disabled optional secret reference was not prepared"
grep -Fqx \
  "[WARN] Optional secret GITHUB_APP_ID is not configured; applying a disabled value." \
  "${log_file}" || fail "empty optional warning was not emitted"

run_parser 'NEXTAUTH_SECRET=nextauth
GOOGLE_CLIENT_ID=google-id
GOOGLE_CLIENT_SECRET=google-secret
ADMIN_EMAILS=
GITHUB_APP_ID=123
GITHUB_APP_INSTALLATION_ID=456
GITHUB_APP_PRIVATE_KEY_BASE64=a2V5'
grep -Fqx "admin-emails=__disabled_admin__@invalid.invalid" "${output_file}" ||
  fail "empty ADMIN_EMAILS was not disabled"
grep -Fqx "ADMIN_EMAILS=secretref:admin-emails" "${output_file}" ||
  fail "disabled ADMIN_EMAILS secret reference was not prepared"

if run_parser 'NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=google-id
GOOGLE_CLIENT_SECRET=google-secret'; then
  fail "empty required secret was accepted"
fi
grep -Fqx "[ERROR] Required secret NEXTAUTH_SECRET is not configured." "${log_file}" ||
  fail "empty required secret error was not emitted"

if run_parser 'NEXTAUTH_SECRET=nextauth
GOOGLE_CLIENT_ID=google-id
GOOGLE_CLIENT_SECRET=google-secret
INVALID-KEY=value'; then
  fail "invalid KEY was accepted"
fi
grep -Fqx "[ERROR] Secret environment entry has an empty or invalid KEY." "${log_file}" ||
  fail "invalid KEY error was not emitted"

secret_marker="must-not-appear-in-parser-log"
run_parser "NEXTAUTH_SECRET=${secret_marker}
GOOGLE_CLIENT_ID=google-id
GOOGLE_CLIENT_SECRET=google-secret"
if grep -Fq "${secret_marker}" "${log_file}"; then
  fail "secret value was written to the parser log"
fi

printf '[PASS] ACA secret reference parser tests passed.\n'
