from __future__ import annotations

import json
import threading
import tempfile
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from omega.config import OmegaConfig
from omega.runtime import OmegaRuntime
from omega.http_api import OmegaHTTPService


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.project_root = Path(__file__).resolve().parents[1]
        self.temp = tempfile.TemporaryDirectory(prefix="omega-api-")
        self.root = Path(self.temp.name)
        self.runtime = OmegaRuntime(OmegaConfig(project_root=self.root))
        self.service = OmegaHTTPService(self.runtime, host="127.0.0.1", port=0,
                                        web_root=str(self.project_root / "web"))
        self.server = None
        self.thread = threading.Thread(target=self._serve, daemon=True)
        self.thread.start()
        self.wait_for_server()

    def _serve(self) -> None:
        self.server = self.service.start()
        self.service.serve_forever()

    def wait_for_server(self) -> None:
        deadline = time.time() + 10
        while time.time() < deadline:
            if self.service.server is not None:
                return
            time.sleep(0.05)
        raise RuntimeError("API server did not start")

    def tearDown(self) -> None:
        if self.server is not None:
            self.service.shutdown()
            self.server.server_close()
        self.thread.join(timeout=5)
        self.temp.cleanup()

    def _request(self, method: str, path: str, payload=None):
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        request = Request(
            f"http://127.0.0.1:{self.service.port}{path}",
            data=body,
            method=method,
            headers={"Content-Type": "application/json"} if payload is not None else {},
        )
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # pragma: no cover
            raise AssertionError(f"Request failed for {method} {path}: {exc}") from exc

    def test_health_and_capabilities_endpoints(self) -> None:
        status, body = self._request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        status, body = self._request("GET", "/capabilities")
        self.assertEqual(status, 200)
        self.assertIn("tool_runtime", body["capabilities"])
        status, body = self._request("GET", "/models")
        self.assertEqual(status, 200)
        self.assertEqual(body["active"], "offline")

    def test_chat_endpoint_blocks_invalid_requests(self) -> None:
        request = Request(
            f"http://127.0.0.1:{self.service.port}/chat",
            data=b"not-json",
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=5)
        caught.exception.close()

    def test_chat_rejects_cross_origin_and_oversized_requests(self) -> None:
        request = Request(
            f"http://127.0.0.1:{self.service.port}/chat",
            data=json.dumps({"prompt": "hello"}).encode("utf-8"),
            method="POST",
            headers={"Content-Type": "application/json", "Origin": "https://attacker.invalid"},
        )
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=5)
        self.assertEqual(caught.exception.code, 403)
        caught.exception.close()

        request = Request(
            f"http://127.0.0.1:{self.service.port}/chat",
            data=b"{}",
            method="POST",
            headers={"Content-Type": "application/json",
                     "Content-Length": str(self.service.MAX_BODY_BYTES + 1)},
        )
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=5)
        self.assertEqual(caught.exception.code, 413)
        caught.exception.close()

    def test_static_files_cannot_escape_web_root(self) -> None:
        request = Request(f"http://127.0.0.1:{self.service.port}/%2e%2e/README.md")
        with self.assertRaises(HTTPError) as caught:
            urlopen(request, timeout=5)
        self.assertEqual(caught.exception.code, 404)
        caught.exception.close()

    def test_chat_endpoint_returns_real_result(self) -> None:
        status, body = self._request("POST", "/chat", {"prompt": "(9 + 3) * 2"})
        self.assertEqual(status, 200)
        self.assertIn("24", body["response"])
        self.assertTrue(body["session_id"])
        self.assertEqual(len(self.runtime.store.conversation_messages(body["session_id"])), 2)
        status, history = self._request("GET", f"/sessions/{body['session_id']}")
        self.assertEqual(status, 200)
        self.assertEqual([message["role"] for message in history["messages"]], ["user", "assistant"])

    def test_dashboard_is_served_by_backend(self) -> None:
        with urlopen(f"http://127.0.0.1:{self.service.port}/", timeout=5) as response:
            self.assertEqual(response.status, 200)
            self.assertIn("OMEGA AGI FORGE", response.read().decode("utf-8"))

    def test_chat_routes_local_search_and_planning(self) -> None:
        self.runtime.store.index_document("guide.md", "Offline retrieval keeps local documents searchable.")
        status, result = self._request("POST", "/chat", {"prompt": "search: local documents"})
        self.assertEqual(status, 200)
        self.assertIn("guide.md", result["response"])
        status, result = self._request("POST", "/chat", {"prompt": "plan: build a safe tool"})
        self.assertEqual(status, 200)
        self.assertIn("Review requirements", result["response"])

    def test_chat_uses_saved_memory_and_confined_file_tools(self) -> None:
        self.runtime.store.add_memory("Keep the local workflow offline", provenance="test")
        status, result = self._request("POST", "/chat", {"prompt": "memory: local workflow"})
        self.assertEqual(status, 200)
        self.assertIn("Keep the local workflow offline", result["response"])
        status, result = self._request("POST", "/chat", {"prompt": "files: omega"})
        self.assertEqual(status, 200)
        self.assertIn("omega", result["response"])
        status, result = self._request("POST", "/chat", {"prompt": "read: ../README.md"})
        self.assertEqual(status, 200)
        self.assertIn("File-read request rejected", result["response"])


if __name__ == "__main__":
    unittest.main()
