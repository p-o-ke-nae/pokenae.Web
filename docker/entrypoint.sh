#!/bin/sh
# Docker Compose secrets を環境変数に展開し、必要に応じて権限降格する
#
# マッピング:
#   /run/secrets/nextauth_secret      → NEXTAUTH_SECRET
#   /run/secrets/google_client_id     → GOOGLE_CLIENT_ID
#   /run/secrets/google_client_secret → GOOGLE_CLIENT_SECRET
#   /run/secrets/admin_emails → ADMIN_EMAILS
#   /run/secrets/github_app_* → GITHUB_APP_*

set -eu

secrets_dir=${SECRETS_DIR:-/run/secrets}

if [ -d "$secrets_dir" ]; then
  for secret_file in "$secrets_dir"/*; do
    [ -e "$secret_file" ] || continue
    [ -f "$secret_file" ] || continue

    secret_name=$(basename "$secret_file" | tr '[:lower:]' '[:upper:]')
    case "$secret_name" in
      ''|*[!A-Z0-9_]*)
        echo "entrypoint: invalid secret file name: $(basename "$secret_file")" >&2
        exit 1
        ;;
    esac

    if [ ! -r "$secret_file" ]; then
      echo "entrypoint: secret file is not readable: $secret_file" >&2
      exit 1
    fi

    secret_value=$(tr -d '\n\r' < "$secret_file")
    export "$secret_name=$secret_value"
    unset secret_value
  done
fi

if [ "$(id -u)" -eq 0 ] && [ -n "${ENTRYPOINT_DROP_USER:-}" ]; then
  if ! command -v su-exec >/dev/null 2>&1; then
    echo "entrypoint: su-exec is required to drop privileges" >&2
    exit 1
  fi
  exec su-exec "$ENTRYPOINT_DROP_USER" "$@"
fi

exec "$@"
