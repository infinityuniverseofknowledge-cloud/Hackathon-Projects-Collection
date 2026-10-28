"""Explicitly configured OpenAI-compatible chat endpoint; never auto-discovers remote services."""

from __future__ import annotations

import json
import os
import shutil
import urllib.error
import urllib.request
from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit


class ProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProviderConfig:
    base_url: str
    model: str
    api_key: str = ""
    timeout: int = 30


def detect_runtime_status(env: dict[str, str] | None = None) -> dict[str, str | None]:
    values = os.environ if env is None else env
    base_url = values.get("OMEGA_BASE_URL", "").strip()
    model = values.get("OMEGA_MODEL", "").strip()
    if base_url and model:
        return {"mode": "configured", "endpoint": base_url.rstrip("/"), "model": model}
    local_candidates = ["ollama", "llama-server", "llama.cpp", "llama-runner", "qwen-server"]
    detected = next((name for name in local_candidates if shutil.which(name)), None)
    if detected:
        return {"mode": "local_runtime", "endpoint": f"local:{detected}", "model": detected}
    return {"mode": "offline", "endpoint": None, "model": "deterministic"}


def configured_provider() -> ProviderConfig | None:
    base_url = os.environ.get("OMEGA_BASE_URL", "").strip()
    model = os.environ.get("OMEGA_MODEL", "").strip()
    if not base_url or not model:
        return None
    return ProviderConfig(base_url.rstrip("/"), model,
                          os.environ.get("OMEGA_API_KEY", ""), 30)


def display_endpoint(base_url: str) -> str:
    try:
        parsed = urlsplit(base_url)
        hostname = parsed.hostname
        if not parsed.scheme or not hostname:
            return "configured endpoint"
        host = f"[{hostname}]" if ":" in hostname else hostname
        if parsed.port:
            host += f":{parsed.port}"
        return urlunsplit((parsed.scheme, host, parsed.path, "", ""))
    except ValueError:
        return "configured endpoint"


def chat(config: ProviderConfig, prompt: str) -> str:
    if len(prompt) > 20_000:
        raise ProviderError("Prompt exceeds the 20,000-character limit")
    url = config.base_url
    if not url.endswith("/chat/completions"):
        url += "/chat/completions"
    body = json.dumps({"model": config.model,
                       "messages": [{"role": "user", "content": prompt}],
                       "stream": False}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=max(1, min(config.timeout, 60))) as response:
            payload = json.loads(response.read(2_000_001).decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ProviderError(f"Provider request failed: {type(exc).__name__}") from exc
    try:
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ProviderError("Provider returned an unexpected response shape") from exc
    if not isinstance(content, str):
        raise ProviderError("Provider response content was not text")
    return content