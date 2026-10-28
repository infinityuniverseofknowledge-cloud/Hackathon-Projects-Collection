# Benchmarks

`python3 -m omega benchmark --json` runs three deterministic smoke checks: arithmetic, SQLite initialization, and temporary-store note retrieval. The report reflects actual booleans from that invocation; it is not an LLM, agent-quality, speed, or intelligence benchmark.

The checked-in unit suite currently has 10 passing tests covering arithmetic rejection, state transitions, note/document persistence, filesystem boundaries, explicit execution approval, a mocked OpenAI-compatible provider request/response, and endpoint diagnostic redaction. Run `python3 -W error::ResourceWarning -m unittest discover -s tests -v`. No latency, CPU, peak-memory, model-quality, or comparative framework performance measurements have been collected.