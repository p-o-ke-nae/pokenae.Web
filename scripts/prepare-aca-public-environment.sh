#!/usr/bin/env bash

set -euo pipefail

declare -ag ACA_PUBLIC_ENV_ARGS=()

prepare_aca_public_environment() {
  local variable_name value
  local -a required_variables=(
    NEXTAUTH_URL
    NEXT_PUBLIC_API_BASE_URL
    NEXT_PUBLIC_API_URL
    API_SERVICES
    API_SERVICE_GAME_LIBRARY_API_BASE_URL
    CONTENT_REPOSITORY_OWNER
    CONTENT_REPOSITORY_NAME
    CONTENT_REPOSITORY_REF
    GAME_LIBRARY_API_VERSION_RANGE
  )

  ACA_PUBLIC_ENV_ARGS=(
    "NODE_ENV=production"
    "PORT=3000"
  )

  for variable_name in "${required_variables[@]}"; do
    value="${!variable_name:-}"
    if [[ -z "${value}" ]]; then
      printf '[ERROR] %s is not configured in the selected GitHub Environment.\n' "${variable_name}" >&2
      return 1
    fi
    if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
      printf '[ERROR] %s must be a single-line value.\n' "${variable_name}" >&2
      return 1
    fi
    ACA_PUBLIC_ENV_ARGS+=("${variable_name}=${value}")
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  prepare_aca_public_environment
  printf '[INFO] Prepared %d ACA public environment variables.\n' "${#ACA_PUBLIC_ENV_ARGS[@]}"
fi
