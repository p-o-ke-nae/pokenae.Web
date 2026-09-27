#!/bin/sh

set -eu

entrypoint=${ENTRYPOINT_PATH:-/usr/local/bin/entrypoint.sh}
process_user_verifier=${PROCESS_USER_VERIFIER_PATH:-/usr/local/bin/verify-process-user.sh}
state_dir=/.entrypoint-test-state
test_process_pid=

cleanup() {
  if [ -n "$test_process_pid" ]; then
    kill "$test_process_pid" 2>/dev/null || true
    wait "$test_process_pid" 2>/dev/null || true
  fi
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

mkdir -p "$state_dir/bin"
cat > "$state_dir/bin/npm" <<'EOF'
#!/bin/sh
set -eu
[ "$NODE_ENV" = "production" ]
[ "$1" = "run" ]
[ "$2" = "build" ]
EOF
chmod 755 "$state_dir/bin/npm"

PATH="$state_dir/bin:$PATH" \
NODE_ENV=development \
ENTRYPOINT_DROP_USER= \
SECRETS_DIR="$state_dir/secrets" \
"$entrypoint" npm run build

su-exec nextjs:nodejs node -e \
  'process.title = "next-server (test)"; setInterval(() => {}, 1000)' &
test_process_pid=$!
sleep 1

su-exec nextjs:nodejs "$process_user_verifier" 1001

if "$process_user_verifier" 1001 >/dev/null 2>&1; then
  echo "process user verifier accepted execution as an unexpected UID" >&2
  exit 1
fi

if su-exec nextjs:nodejs "$process_user_verifier" 0 >/dev/null 2>&1; then
  echo "process user verifier accepted an unexpected UID" >&2
  exit 1
fi

kill "$test_process_pid"
wait "$test_process_pid" 2>/dev/null || true
test_process_pid=

if su-exec nextjs:nodejs "$process_user_verifier" 1001 >/dev/null 2>&1; then
  echo "process user verifier accepted a missing Node.js process" >&2
  exit 1
fi

node -e 'setInterval(() => {}, 1000)' &
test_process_pid=$!
sleep 1

if su-exec nextjs:nodejs "$process_user_verifier" 1001 >/dev/null 2>&1; then
  echo "process user verifier accepted a Node.js process that did not drop privileges" >&2
  exit 1
fi

echo "entrypoint tests passed"
