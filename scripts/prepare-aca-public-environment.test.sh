#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
parser="${script_dir}/prepare-aca-public-environment.sh"
output_file="${script_dir}/.prepare-aca-public-environment.test-output.$$"
log_file="${script_dir}/.prepare-aca-public-environment.test-log.$$"
trap 'rm -f "${output_file}" "${log_file}"' EXIT

fail() {
  printf '[FAIL] %s\n' "$*" >&2
  exit 1
}

export NEXTAUTH_URL=https://example.com
export NEXT_PUBLIC_API_BASE_URL=https://api.example.com
export NEXT_PUBLIC_API_URL=https://api.example.com
export API_SERVICES=game-library-api
export API_SERVICE_GAME_LIBRARY_API_BASE_URL=https://game-library.example.com
export CONTENT_REPOSITORY_OWNER=p-o-ke-nae
export CONTENT_REPOSITORY_NAME=pokenae.Content
export CONTENT_REPOSITORY_REF=main
export GAME_LIBRARY_API_VERSION_RANGE='>=1.0.0 <2.0.0'

PARSER="${parser}" bash -c '
  source "${PARSER}"
  prepare_aca_public_environment
  printf "%s\n" "${ACA_PUBLIC_ENV_ARGS[@]}"
' > "${output_file}"

grep -Fqx "GAME_LIBRARY_API_VERSION_RANGE=>=1.0.0 <2.0.0" "${output_file}" ||
  fail "value containing spaces was not preserved"
grep -Fqx "NEXTAUTH_URL=https://example.com" "${output_file}" ||
  fail "NEXTAUTH_URL was not prepared"
grep -Fqx "NODE_ENV=production" "${output_file}" ||
  fail "fixed NODE_ENV was not prepared"

if env -u CONTENT_REPOSITORY_REF PARSER="${parser}" bash -c '
  source "${PARSER}"
  prepare_aca_public_environment
' > "${output_file}" 2> "${log_file}"; then
  fail "missing required variable was accepted"
fi
grep -Fqx \
  "[ERROR] CONTENT_REPOSITORY_REF is not configured in the selected GitHub Environment." \
  "${log_file}" || fail "missing variable error was not emitted"

if CONTENT_REPOSITORY_REF=$'main\ninvalid' PARSER="${parser}" bash -c '
  source "${PARSER}"
  prepare_aca_public_environment
' > "${output_file}" 2> "${log_file}"; then
  fail "multiline value was accepted"
fi
grep -Fqx \
  "[ERROR] CONTENT_REPOSITORY_REF must be a single-line value." \
  "${log_file}" || fail "multiline value error was not emitted"

printf '[PASS] ACA public environment parser tests passed.\n'
