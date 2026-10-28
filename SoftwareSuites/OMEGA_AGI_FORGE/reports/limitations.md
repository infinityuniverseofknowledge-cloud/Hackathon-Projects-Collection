# Known limitations and verified status

## Verified capabilities

- Offline-safe arithmetic and bounded validation via the AST allowlist in `omega.tools.calculate`.
- SQLite-backed local persistence for tasks, memory, documents, and events in `omega.storage.Store`.
- Local project file protections via `omega.security.ProjectFiles`.
- A bounded planner and execution runner in `omega.planner`.
- A local HTTP API with `/health`, `/capabilities`, `/models`, and `/chat` in `omega.http_api`.
- A responsive local dashboard at `web/index.html` that fetches real data from the backend.
- Unit and integration tests run successfully via `python3 -m unittest discover -s tests -v`.

## Unavailable or intentionally not implemented

- No local LLM runtime (Ollama/llama.cpp) was detected in the environment.
- No external provider credentials or environment variables were configured.
- No model weights were downloaded automatically.
- No autonomous coding loop or sandboxed task execution beyond explicit user-approved project test runs.
- No live web research or remote tool execution.
- No multi-agent orchestrator beyond the static role registry.

## Resource constraints

- Android 10, armv7l 32-bit host.
- Approximately 670 MB free storage at the time of the last audit.
- No GPU or root privileges assumed.
- The implementation intentionally avoids heavy dependencies and large downloads.

## Security posture

- Relative paths only; path traversal and symlinks are blocked.
- Sensitive file names such as `.env`, `.pem`, and key files are rejected.
- Project tests require explicit approval before execution.
- Only localhost service binding is used by default.
