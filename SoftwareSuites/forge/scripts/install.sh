#!/usr/bin/env bash
set -euo pipefail
echo "→ Building FORGE in release mode…"
cargo build --release --workspace
echo
echo "✓ Built binaries:"
echo "    target/release/forge"
echo "    target/release/forge-server"
echo
echo "→ Installing forge CLI to ~/.cargo/bin/"
cargo install --path crates/forge-cli
echo
echo "✓ Done. Run 'forge --version' to verify."
