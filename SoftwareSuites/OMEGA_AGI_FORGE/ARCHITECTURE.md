# Architecture

## Runtime

`omega.cli` dispatches bounded commands into `OmegaRuntime`, `Store`, `ToolRegistry`, and the optional provider adapter. The implementation uses Python's standard library only. `Store` creates a version-implicit SQLite schema for tasks, notes, indexed text, conversation turns, and audit events in `<project>/.omega/omega.sqlite3`.

## Current contracts

- Tasks have explicit statuses and checked state transitions. `task run` currently moves a task to `awaiting_approval`; it does not perform autonomous work.
- `ProjectFiles` is the filesystem boundary for built-in project tools. Relative paths only, no traversal, no symlink components. Tool-created files are new-only and size-limited.
- Knowledge indexing accepts a small allowlist of text-like suffixes, limits individual files to 200 KB and each scan to 200 documents, hashes content for incremental updates, and performs simple lexical ranking. Retrieved text is not executable instruction.
- The provider adapter sends a single user prompt to an explicitly configured OpenAI-compatible `/chat/completions` endpoint, with a bounded timeout and response size. It does not select endpoints or models automatically.
- Arithmetic is evaluated by an AST allowlist; no `eval` or shell is used.
- `OmegaRuntime.process_chat` stores user/assistant turns in SQLite and routes explicit `search:` and `plan:` requests to the local index and planner. Other free-form prompts use an explicitly configured provider or state that no language model is configured.
- `omega.http_api` serves `/health`, `/capabilities`, `/models`, `/chat`, and `/sessions/{id}` plus the dashboard. It binds to `127.0.0.1` by default, rejects oversized request bodies, validates JSON and session IDs, checks browser Origin on state-changing requests, and constrains static files to the web root.
- `web/index.html` is a browser-native interface that fetches capabilities and persists its session identifier in local storage. Conversation content is rendered as text, not interpreted as markup.

## Deliberate omissions

There is no token accounting, streaming, cancellation, bounded agent loop, plugin loader, vector store, FTS5 schema, web search, MCP client, multi-agent graph, code-edit agent, or OS sandbox. The conversation contract stores turns, but does not send prior history to remote providers. See [ROADMAP.md](ROADMAP.md).