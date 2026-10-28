#!/usr/bin/env bash
set -euo pipefail
FORGE="${FORGE:-./target/debug/forge}"
if [ ! -x "$FORGE" ]; then
    echo "Building FORGE first…"
    cargo build --workspace
fi

DEMO_DIR="$(mktemp -d)"
echo "→ Demo in $DEMO_DIR"
cd "$DEMO_DIR"

cat > forge.toml <<'TOML'
[forge]
version = "1"

[task.hello]
command = "echo hello > hello.txt"
inputs = ["forge.toml"]
outputs = ["hello.txt"]

[task.world]
command = "echo world > world.txt"
inputs = ["forge.toml"]
outputs = ["world.txt"]

[task.combine]
command = "cat hello.txt world.txt > combined.txt"
inputs = ["forge.toml"]
outputs = ["combined.txt"]
depends = ["hello", "world"]
TOML

echo
echo "═══ First run (cache miss) ═══"
"$FORGE" --root . run combine

echo
echo "═══ Second run (all cache hits) ═══"
"$FORGE" --root . run combine

echo
echo "═══ Task graph (DOT) ═══"
"$FORGE" --root . graph

echo
echo "═══ Clean cache ═══"
"$FORGE" --root . clean

echo
echo "→ Demo complete. Files at $DEMO_DIR"
