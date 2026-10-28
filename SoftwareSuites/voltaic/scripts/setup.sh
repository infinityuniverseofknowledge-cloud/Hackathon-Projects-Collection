#!/usr/bin/env bash
set -euo pipefail
echo "→ Installing dependencies…"
npm install
echo "→ Copying env template…"
[ -f .env.local ] || cp .env.example .env.local
echo "→ Done. Edit .env.local, then run:"
echo "    npm run dev"
