# Architecture

## Crate layout

FORGE is a Cargo workspace with three crates:

### `forge-core` — the library

Pure business logic, no CLI, no global state. Used by both `forge-cli`
and `forge-server`. Public API:

- `Dag` — directed acyclic graph of tasks
- `Task` — task definition (command, inputs, outputs, deps)
- `TaskGraph` — a `Dag` plus `Task` definitions
- `Cache` — content-addressed local cache
- `RemoteCache` — HTTP client for remote cache
- `Config` — parsed `forge.toml`
- `Runner` — parallel task executor
- `Hasher` — SHA-256 content hashing

### `forge-cli` — the binary

Thin wrapper around `forge-core`. Uses `clap` for argument parsing.
Subcommands:

- `forge run <task>` — execute a task and its dependencies
- `forge graph` — print DOT graph
- `forge clean` — delete cache
- `forge watch <task>` — re-run on file change
- `forge remote push/pull <hash>` — manual cache manipulation

### `forge-server` — the remote cache

HTTP server using `axum`. Endpoints:

- `PUT /cache/:hash` — upload an artifact
- `GET /cache/:hash` — download an artifact
- `HEAD /cache/:hash` — check existence
- `GET /health` — liveness

Authenticates via Bearer token (`FORGE_REMOTE_TOKEN`).

## Data flow

    User runs: forge run build

    1. forge-cli loads forge.toml
    2. Builds TaskGraph from tasks and dependencies
    3. Topologically sorts the graph
    4. For each task (in parallel where possible):
        a. Compute hash from inputs + command + deps
        b. Check local cache
        c. If miss: check remote cache
        d. If miss: run command, store outputs in cache
        e. If hit: restore outputs to filesystem
    5. Report timing and cache hit ratio

## Hashing

Input hash = SHA256 over a canonical serialization:

    FORGE_VERSION || COMMAND || ENV || SORTED(INPUT_HASHES) || SORTED(DEP_HASHES)

Each input file is itself hashed with SHA-256. Two tasks with identical
semantic inputs (regardless of mtime) get the same hash.

## Parallelism

Uses Rayon for work-stealing parallelism. The scheduler maintains a
counter of unfinished dependencies per task. When a task completes, it
decrements the counters of its dependents. A task whose counter reaches
zero is submitted to Rayon.
