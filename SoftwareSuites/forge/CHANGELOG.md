# Changelog

All notable changes to FORGE are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2025-01-15

### Added
- Initial release
- DAG-based task scheduler with topological sort
- SHA-256 content-addressed cache
- Parallel task execution via Rayon
- TOML configuration (`forge.toml`)
- CLI commands: `run`, `graph`, `clean`, `watch`, `remote`
- Remote cache server (axum HTTP)
- Integration tests for DAG and cache
