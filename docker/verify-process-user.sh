#!/bin/sh

set -eu

expected_uid=${1:-1001}

case "$expected_uid" in
  ''|*[!0-9]*)
    echo "verify-process-user: expected UID must be numeric" >&2
    exit 2
    ;;
esac

node_processes=0
invalid_processes=0

for process_dir in /proc/[0-9]*; do
  [ -r "$process_dir/status" ] || continue

  executable=$(readlink "$process_dir/exe" 2>/dev/null || true)
  [ "${executable##*/}" = "node" ] || continue

  node_processes=$((node_processes + 1))
  pid=${process_dir##*/}
  actual_uid=$(awk '/^Uid:/ { print $2; exit }' "$process_dir/status" 2>/dev/null || true)

  if [ "$actual_uid" != "$expected_uid" ]; then
    echo "verify-process-user: Node.js PID $pid is running as UID ${actual_uid:-unknown}; expected $expected_uid" >&2
    invalid_processes=$((invalid_processes + 1))
  fi
done

if [ "$node_processes" -eq 0 ]; then
  echo "verify-process-user: no running Node.js process was found" >&2
  exit 1
fi

if [ "$invalid_processes" -ne 0 ]; then
  exit 1
fi

echo "verify-process-user: all $node_processes Node.js process(es) are running as UID $expected_uid"
