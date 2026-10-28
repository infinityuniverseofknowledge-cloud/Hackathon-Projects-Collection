# Implementation Plan

Milestones track working behavior, not file counts. Only completed portions are marked done.

| Milestone | Scope | State |
|---|---|---|
| A | Environment inspection and upstream reconnaissance | Complete, bounded survey; see RESEARCH_REPORT.md |
| B | Lightweight scaffolding and dependency policy | Complete; standard library only |
| C | Runtime and practical CLI | Partial; command CLI, no conversational planner |
| D | Provider abstraction and deterministic fallback | Partial; one compatible chat endpoint, no local-runtime discovery |
| E | Planning, tasks, checkpoints | Partial; durable state and transitions, no planner/resume engine |
| F | Memory and local retrieval | Partial; explicit notes and lexical document index |
| G | Controlled tools and coding workflow | Partial; bounded read/new-file tools, no coding agent |
| H | Multi-agent orchestration | Not started |
| I | Security controls and audit events | Partial; path gate, explicit test approval, SQLite event rows |
| J | Evaluations and regressions | Partial; unit tests and deterministic smoke checks |
| K | API or dashboard | Not started |
| L | Docs, install, packaging, acceptance | Partial; docs/scripts/package metadata created, release gates outstanding |

Next: complete end-to-end CLI acceptance checks, improve filesystem race resistance, add config schema validation, and establish FTS-backed retrieval before adding agent autonomy.