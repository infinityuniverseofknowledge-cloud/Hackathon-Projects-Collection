#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
if [ "$#" -eq 0 ]; then
  set -- chat
fi
exec "${PYTHON:-python3}" -m omega "$@"