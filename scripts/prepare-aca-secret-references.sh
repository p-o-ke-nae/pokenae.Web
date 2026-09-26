#!/usr/bin/env bash

set -euo pipefail

declare -ag ACA_SECRET_ARGS=()
declare -ag ACA_SECRET_ENV_ARGS=()

prepare_aca_secret_references() {
  local input="${1-}"
  local line key value secret_name
  local -a parsed_keys=()
  local -A parsed_values=()
  local -A seen_keys=()
  local -A optional_disabled_values=(
    [ADMIN_EMAILS]="__disabled_admin__@invalid.invalid"
    [GITHUB_APP_ID]="0"
    [GITHUB_APP_INSTALLATION_ID]="0"
    [GITHUB_APP_PRIVATE_KEY_BASE64]="ZGlzYWJsZWQ="
  )
  local -a required_keys=(
    NEXTAUTH_SECRET
    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
  )
  local -a optional_keys=(
    ADMIN_EMAILS
    GITHUB_APP_ID
    GITHUB_APP_INSTALLATION_ID
    GITHUB_APP_PRIVATE_KEY_BASE64
  )

  ACA_SECRET_ARGS=()
  ACA_SECRET_ENV_ARGS=()

  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" ]] && continue

    if [[ "${line}" != *=* ]]; then
      printf '[ERROR] Secret environment entries must use KEY=VALUE, one per line.\n' >&2
      return 1
    fi

    key="${line%%=*}"
    value="${line#*=}"

    if [[ ! "${key}" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
      printf '[ERROR] Secret environment entry has an empty or invalid KEY.\n' >&2
      return 1
    fi
    if [[ -n "${seen_keys[${key}]:-}" ]]; then
      printf '[ERROR] Secret environment KEY %s is duplicated.\n' "${key}" >&2
      return 1
    fi

    seen_keys["${key}"]=1
    parsed_keys+=("${key}")
    parsed_values["${key}"]="${value}"
  done <<< "${input}"

  for key in "${required_keys[@]}"; do
    if [[ -z "${seen_keys[${key}]:-}" || -z "${parsed_values[${key}]:-}" ]]; then
      printf '[ERROR] Required secret %s is not configured.\n' "${key}" >&2
      return 1
    fi
  done

  for key in "${optional_keys[@]}"; do
    if [[ -z "${seen_keys[${key}]:-}" ]]; then
      parsed_keys+=("${key}")
      parsed_values["${key}"]=""
    fi
  done

  for key in "${parsed_keys[@]}"; do
    value="${parsed_values[${key}]}"
    if [[ -z "${value}" ]]; then
      if [[ -z "${optional_disabled_values[${key}]:-}" ]]; then
        printf '[ERROR] Secret %s must not be empty.\n' "${key}" >&2
        return 1
      fi
      value="${optional_disabled_values[${key}]}"
      printf '[WARN] Optional secret %s is not configured; applying a disabled value.\n' "${key}" >&2
    fi

    secret_name="${key,,}"
    secret_name="${secret_name//_/-}"
    ACA_SECRET_ARGS+=("${secret_name}=${value}")
    ACA_SECRET_ENV_ARGS+=("${key}=secretref:${secret_name}")
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  prepare_aca_secret_references "${SECRET_ENV_VARS:-}"
  printf '[INFO] Prepared %d ACA secret references.\n' "${#ACA_SECRET_ARGS[@]}"
fi
