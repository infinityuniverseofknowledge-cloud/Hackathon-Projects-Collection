from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from omega.config import OmegaConfig
from omega.providers import (ProviderConfig, ProviderError, chat, detect_runtime_status,
                             display_endpoint)
from omega.runtime import OmegaRuntime


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit: int) -> bytes:
        return json.dumps(self.payload).encode()


class ProviderTests(unittest.TestCase):
    def test_provider_diagnostic_redacts_url_credentials_and_query(self):
        displayed = display_endpoint("https://user:pass@example.test/v1?token=secret#fragment")
        self.assertEqual(displayed, "https://example.test/v1")
        self.assertNotIn("secret", displayed)

    @patch("omega.providers.urllib.request.urlopen")
    def test_openai_compatible_shape_and_auth_are_explicit(self, urlopen):
        urlopen.return_value = FakeResponse({"choices": [{"message": {"content": "hello"}}]})
        result = chat(ProviderConfig("http://127.0.0.1:11434/v1", "local-model", "secret"), "hi")
        self.assertEqual(result, "hello")
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "http://127.0.0.1:11434/v1/chat/completions")
        self.assertEqual(request.get_header("Authorization"), "Bearer secret")
        self.assertNotIn("secret", request.data.decode())

    @patch("omega.providers.urllib.request.urlopen")
    def test_invalid_response_is_reported_without_payload_dump(self, urlopen):
        urlopen.return_value = FakeResponse({"error": "private detail"})
        with self.assertRaisesRegex(ProviderError, "unexpected response shape"):
            chat(ProviderConfig("http://localhost/v1", "model"), "hello")

    @patch("omega.providers.urllib.request.urlopen")
    def test_runtime_uses_configured_provider_without_exposing_credentials(self, urlopen):
        urlopen.return_value = FakeResponse({"choices": [{"message": {"content": "provider answer"}}]})
        with tempfile.TemporaryDirectory(prefix="omega-provider-") as temporary:
            with patch.dict(os.environ, {
                "OMEGA_BASE_URL": "http://127.0.0.1:9000/v1",
                "OMEGA_MODEL": "test-model",
                "OMEGA_API_KEY": "test-secret",
            }):
                runtime = OmegaRuntime(OmegaConfig(project_root=Path(temporary)))
                result = runtime.process_chat("hello")
        self.assertEqual(result["response"], "provider answer")
        self.assertNotIn("test-secret", result["response"])
        self.assertEqual(urlopen.call_count, 1)

    def test_three_model_modes_are_reported_honestly(self):
        offline_status = detect_runtime_status({})
        self.assertEqual(offline_status["mode"], "offline")

        configured_status = detect_runtime_status({
            "OMEGA_BASE_URL": "http://127.0.0.1:11434/v1",
            "OMEGA_MODEL": "qwen2.5",
        })
        self.assertEqual(configured_status["mode"], "configured")
        self.assertIn("http://127.0.0.1:11434/v1", str(configured_status["endpoint"]))

        local_status = detect_runtime_status({"OMEGA_BASE_URL": "", "OMEGA_MODEL": ""})
        self.assertIn(local_status["mode"], {"offline", "local_runtime"})


if __name__ == "__main__":
    unittest.main()