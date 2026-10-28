# Security

## Implemented protections

- Local/offline behavior is the default. Remote chat requires `OMEGA_BASE_URL` and `OMEGA_MODEL`; `OMEGA_API_KEY` is optional and read from the environment.
- The CLI does not print credential values; provider diagnostics strip URL userinfo, query strings, and fragments. Provider errors omit response bodies and authentication headers.
- Arithmetic accepts only numeric constants and basic operators, with expression, exponent, and result bounds.
- Project tools reject absolute paths, traversal, and symlink components. Reads are size-limited; writes are new-file-only and capped at 1 MB.
- Project tools deny common secret-bearing paths such as `.env*`, `.npmrc`, `.pypirc`, credential files, private-key names, `.git`, and OMEGA runtime state.
- Project test execution is denied unless `--approve-test-execution` is supplied.
- Imported knowledge is only indexed; no retrieval path authorizes tools or shell commands.
- No generated code execution, shell tool, public server, privileged operation, or deployment feature is present.
- The HTTP API binds to `127.0.0.1` by default, limits request bodies, accepts JSON only for chat, validates session identifiers, and rejects cross-origin POST requests whose Origin does not match the Host.
- Static dashboard files are resolved and constrained to the configured web root. Conversation content is emitted as JSON and the bundled UI renders it using `textContent`.
- The API persists submitted chat turns in the local SQLite database. The database is not encrypted, and any local process able to access it can read those turns.

## Limitations

Path validation is not a race-free OS sandbox; another process could change filesystem entries between validation and use. Python process tests run with the user's permissions once approved. This Termux session did not verify seccomp, namespaces, containers, or resource quotas. Do not use this version to execute untrusted project tests or handle adversarial documents as commands. Local SQLite data is not encrypted. The provider endpoint is trusted configuration: chat prompts are transmitted to that endpoint. If the server is explicitly rebound to a non-loopback interface, it has no user authentication and must not be exposed to an untrusted network.