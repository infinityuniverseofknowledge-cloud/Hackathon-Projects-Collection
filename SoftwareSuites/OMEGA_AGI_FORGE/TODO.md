# TODO

## P0

- Harden path operations against filesystem races and test symlink swap behavior.
- Verify install script, clean-start behavior, task/memory persistence across CLI processes, export, and approved test command.
- Add configuration validation and schema version migrations.

## P1

- Implement SQLite FTS5 retrieval with bounded indexed file count, stale-document deletion, and source-grounded result tests.
- Add provider endpoint timeout/size/error tests and explicit local-versus-remote diagnostics.
- Add measured resource and latency benchmark instrumentation.

## P2

- Design a permission-aware task planner and resumable executor; use only an independently verified sandbox for code execution.
- Research ARMv7-compatible model runtime/model artifact size and license before any optional local inference work.
- Evaluate MCP, plugin manifests, and specialist-role coordination as optional modules.
- Decide project source license before public release.