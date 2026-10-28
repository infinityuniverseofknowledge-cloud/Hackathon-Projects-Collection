# Quick Start

```sh
python3 -m omega setup
python3 -m omega doctor
python3 -m omega chat
python3 -m omega task add 'Review local notes'
python3 -m omega task list
python3 -m omega memory add 'A note I explicitly want saved'
python3 -m omega memory search 'explicitly saved'
python3 -m omega knowledge index examples/sample_project
python3 -m omega knowledge search 'untrusted data'
python3 -m omega benchmark --json
```

Use `python3 -m omega --help` for commands. Chat without a provider can calculate basic arithmetic; it is not an LLM. `task run ID` only marks the task as awaiting approval and executes nothing. Run arbitrary project tests only after reviewing them and passing `project test --approve-test-execution`.