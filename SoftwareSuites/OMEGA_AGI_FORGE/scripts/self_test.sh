#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PYTHON=${PYTHON:-python3}
cd "$ROOT"
"$PYTHON" -m unittest discover -s tests -v
"$PYTHON" -m omega doctor
"$PYTHON" -m omega benchmark --json
