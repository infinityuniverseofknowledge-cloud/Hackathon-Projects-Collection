# OMEGA AGI FORGE

OMEGA AGI FORGE is a small offline-first AI engineering runtime for local tasks, arithmetic, document indexing, task persistence, provider-aware chat, and a lightweight local dashboard. It is intentionally conservative: it does not claim to be a general-purpose frontier model, and it requires explicit provider configuration for any remote inference.

## Verified since the last update

- A local HTTP API with `/health`, `/capabilities`, `/models`, and `/chat` is implemented and tested.
- A responsive local dashboard is served from `web/index.html` and calls the backend over localhost.
- A real runtime passes the project test suite with 22 passing tests.
- The system remains deterministic and offline-first when no model runtime is configured.

## Quick start

Python 3.10+ is required. No package install or model download is needed.

```sh
cd /storage/emulated/0/Download/OMEGA_AGI_FORGE
python3 -m omega setup
python3 -m omega doctor
python3 -m omega chat "(7 * 6)"
python3 -m omega task add "Review the local notes"
python3 -m omega project list
python3 -m omega knowledge index .
python3 -m omega knowledge search "local"
python3 -m unittest discover -s tests -v
```

To launch the web dashboard and API:

```sh
cd /storage/emulated/0/Download/OMEGA_AGI_FORGE
python3 -m omega serve --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/` in a browser.

## Current boundaries

- No local model runtime (such as Ollama or llama.cpp) was detected in this environment.
- No external provider credentials or environment variables were configured, so the runtime remains deterministic and offline-only unless the user explicitly sets them.
- Filesystem tools restrict access to the project tree, deny absolute paths and symlinks, and refuse overwrite of existing files.
- Project test execution still requires explicit approval.
- The dashboard and API are intentionally local-only and are not exposed externally.

See [STATUS.md](STATUS.md), [SECURITY.md](SECURITY.md), and [reports/limitations.md](reports/limitations.md) for the latest verified constraints.