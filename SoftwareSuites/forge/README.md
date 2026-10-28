# FORGE

> Fast, incremental build system with content-addressed cache and remote execution.
> Written in Rust. Distributed via `cargo install` and Homebrew.

## Why FORGE

Modern monorepos need build systems that are **fast, correct, and remote**:

- **Make** doesn't hash inputs — it uses mtimes (unreliable)
- **Bazel** is correct but requires a Java daemon and complex setup
- **Turborepo** is JS-only and cloud-locked
- **Nx** is JS-heavy and its cache is opaque

**FORGE** is a single static binary, ~8 MB, no runtime, no daemon.
It uses **SHA-256 content-addressed caching** so it's correct by construction.
It runs tasks **in parallel** based on the dependency DAG.
It supports a **remote cache server** for team collaboration.

## Install

### From crates.io

    cargo install forge-cli

### From Homebrew (macOS/Linux)

    brew install forge-rs/tap/forge

### From source

    git clone https://github.com/forge-rs/forge
    cd forge
    cargo build --release
    # binary at target/release/forge

## Quick start

Create a `forge.toml` in your project root:

    [forge]
    version = "1"

    [task.build]
    command = "cargo build --release"
    inputs = ["src/**/*.rs", "Cargo.toml"]
    outputs = ["target/release/myapp"]
    depends = ["lint"]

    [task.lint]
    command = "cargo clippy -- -D warnings"
    inputs = ["src/**/*.rs", "Cargo.toml"]

    [task.test]
    command = "cargo test"
    inputs = ["src/**/*.rs", "tests/**/*.rs"]
    depends = ["build"]

Then:

    forge run build          # runs lint → build, cached
    forge run test           # runs build → test, cached
    forge run build          # instant (cache hit, 0 ms)
    forge graph              # print DOT graph of tasks
    forge clean              # delete local cache
    forge watch build        # re-run on file change

## Real algorithms

| Module             | Algorithm                       | Reference                  |
|--------------------|---------------------------------|----------------------------|
| `dag.rs`           | Topological sort (Kahn)         | Kahn 1962                  |
| `dag.rs`           | Cycle detection                 | DFS three-colors           |
| `hash.rs`          | SHA-256 content addressing      | FIPS 180-4                 |
| `hash.rs`          | Merkle tree of inputs           | Merkle 1979                |
| `runner.rs`        | Parallel scheduler (Rayon)      | —                          |
| `cache.rs`         | Content-addressed store         | Nix / Bazel style          |
| `cache.rs`         | LRU eviction                    | —                          |
| `config.rs`        | TOML parsing + validation       | —                          |
| `remote.rs`        | HTTP PUT/GET with retry         | —                          |
| `watch.rs`         | File system events (inotify)    | —                          |

## Architecture

FORGE is a **Cargo workspace** with three crates:

- **`forge-core`** — the library (no CLI, no I/O beyond what's needed)
- **`forge-cli`** — the `forge` binary (clap-based, uses `forge-core`)
- **`forge-server`** — the remote cache server (axum HTTP, separate binary)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Caching

FORGE hashes the **content** of all input files, not their modification
times. Two builds with identical inputs produce identical hashes and
therefore identical cache keys. This makes the cache **correct by
construction**.

Hash computation:

    hash = SHA256(
        command + "\n" +
        sorted(env_vars) + "\n" +
        sorted(file_path → SHA256(file_content)) + "\n" +
        sorted(dependency_hashes)
    )

Outputs are stored in `.forge/cache/<hash>/`. On a cache hit, FORGE
copies them to their target locations in milliseconds.

## Remote cache

Enable remote caching with:

    export FORGE_REMOTE_URL=https://cache.mycompany.com
    export FORGE_REMOTE_TOKEN=secret-token

FORGE will then:

1. **On cache miss**: run the task, store locally, and push to remote
2. **On local cache hit**: restore from local cache (fast)
3. **On remote cache hit**: download from remote, store locally

This means CI and devs share the same cache — the first CI run populates
it, then every dev gets instant cache hits.

## License

Dual-licensed under MIT and Apache 2.0. Commercial remote cache server
available separately — see https://forge.rs/pricing.
