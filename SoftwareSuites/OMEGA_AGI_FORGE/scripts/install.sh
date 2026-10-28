#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PYTHON=${PYTHON:-python3}
"$PYTHON" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else "Python 3.10+ required")'
cd "$ROOT"
"$PYTHON" -m omega setup
"$PYTHON" -m unittest discover -s tests -v
printf '%s\n' 'OMEGA initialized. No third-party dependencies or models were installed.'