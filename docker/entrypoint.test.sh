#!/bin/sh

set -eu

entrypoint=${ENTRYPOINT_PATH:-/usr/local/bin/entrypoint.sh}
state_dir=/.entrypoint-test-state

cleanup() {
  rm -rf "$state_dir"
}
trap cleanup EXIT

mkdir -p "$state_dir/secrets"
chmod 755 "$state_dir" "$state_dir/secrets"
printf 'secret value\r\n' > "$state_dir/secrets/sample_secret"
chmod 600 "$state_dir/secrets/sample_secret"

cat > "$state_dir/assert-command.sh" <<'EOF'
#!/bin/sh
set -eu
[ "$(id -u)" = "1001" ]
[ "$(id -g)" = "1001" ]
[ "$SAMPLE_SECRET" = "secret value" ]
[ "$#" = "2" ]
[ "$1" = "value with spaces" ]
[ "$2" = "literal \"quotes\"" ]
EOF
chmod 755 "$state_dir/assert-command.sh"

ENTRYPOINT_DROP_USER=nextjs:nodejs \
SECRETS_DIR="$state_dir/secrets" \
"$entrypoint" "$state_dir/assert-command.sh" "value with spaces" 'literal "quotes"'

chmod 644 "$state_dir/secrets/sample_secret"
su-exec nextjs:nodejs env \
  ENTRYPOINT_DROP_USER=nextjs:nodejs \
  SECRETS_DIR="$state_dir/secrets" \
  "$entrypoint" "$state_dir/assert-command.sh" "value with spaces" 'literal "quotes"'

echo "entrypoint tests passed"
