#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x bin/aurora ]; then
    echo "-> compilando aurora primeiro"
    go build -o bin/aurora ./cmd/aurora
fi

echo
echo "=== hello.aur ==="
./bin/aurora examples/hello.aur

echo
echo "=== fib.aur ==="
./bin/aurora examples/fib.aur

echo
echo "=== classes.aur ==="
./bin/aurora examples/classes.aur

echo
echo "=== disassembly (primeiras 30 linhas de fib.aur) ==="
./bin/aurora --dump examples/fib.aur | head -30
