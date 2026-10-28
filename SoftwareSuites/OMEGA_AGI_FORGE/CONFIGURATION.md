# Configuration

The checked-in `config.example.json` documents safe defaults; 0.1.0 currently reads provider settings from environment variables rather than loading a user config file.

Offline mode needs no variables. For an explicitly trusted OpenAI-compatible endpoint:

```sh
export OMEGA_BASE_URL='http://127.0.0.1:11434/v1'
export OMEGA_MODEL='your-installed-model-name'
export OMEGA_API_KEY='only-if-your-endpoint-requires-one'
python3 -m omega providers
python3 -m omega chat 'Explain this short prompt'
```

Keep real credentials out of shell history, tracked files, logs, and screenshots. Do not set a remote endpoint unless prompt transmission is intended. `OMEGA_MEMORY_DISABLED=1` disables `omega memory add`. Endpoint discovery, health checks, model lists, routing, and native Ollama `/api/chat` are not supported.