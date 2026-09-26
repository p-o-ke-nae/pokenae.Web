#!/usr/bin/env bash

set -euo pipefail

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT must be set}"

declare -a secret_args=()
declare -a env_args=()

if [[ -n "${SECRET_ENV_VARS:-}" ]]; then
  read -r -a pairs <<< "${SECRET_ENV_VARS}"

  for pair in "${pairs[@]}"; do
    if [[ "${pair}" != *=* ]]; then
      echo "[ERROR] Secret environment entries must use KEY=VALUE." >&2
      exit 1
    fi

    key="${pair%%=*}"
    value="${pair#*=}"

    if [[ ! "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "[ERROR] Secret environment entry has an empty or invalid KEY." >&2
      exit 1
    fi

    if [[ -z "${value}" ]]; then
      echo "[WARN] Optional secret ${key} is not configured; omitting it." >&2
      continue
    fi

    secret_name="${key,,}"
    secret_name="${secret_name//_/-}"
    secret_args+=("${secret_name}=${value}")
    env_args+=("${key}=secretref:${secret_name}")
  done
fi

printf 'set_secrets_args=%s\n' "${secret_args[*]}" >> "${GITHUB_OUTPUT}"
printf 'set_secret_env_args=%s\n' "${env_args[*]}" >> "${GITHUB_OUTPUT}"
