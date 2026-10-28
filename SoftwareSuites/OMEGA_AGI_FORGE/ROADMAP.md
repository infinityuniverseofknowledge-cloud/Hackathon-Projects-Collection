# Roadmap

Prioritized by dependencies and safety:

1. Version the SQLite schema and configuration format; add migration and backup/restore tests.
2. Replace bounded linear document scans with SQLite FTS5 when the device SQLite build supports it; add stale-document removal and source-focused retrieval tests.
3. Add provider contract tests against a local compatible server, with explicit network policy and cancellation behavior.
4. Harden filesystem operations against time-of-check/time-of-use races where a safe portable implementation is feasible.
5. Add resumable task execution only after trusted planner contracts, per-tool permissions, quotas, and verified isolation exist.
6. Evaluate ARMv7-compatible local inference only after checking verified builds, licenses, model sizes, RAM, and free disk; never auto-download.
7. Add authentication and additional UI operations before considering any non-loopback API binding.

No date or capability promise is attached to these research items.