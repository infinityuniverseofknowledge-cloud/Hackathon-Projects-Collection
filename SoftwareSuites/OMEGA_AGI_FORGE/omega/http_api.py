from __future__ import annotations

import json
import mimetypes
import re
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from . import __version__


class OmegaHTTPService:
    MAX_BODY_BYTES = 16_384

    def __init__(self, runtime: Any, host: str = "127.0.0.1", port: int = 8000, web_root: str | None = None) -> None:
        self.runtime = runtime
        self.host = host
        self.port = port
        self.web_root = Path(web_root) if web_root else Path(__file__).resolve().parent.parent / "web"
        self.server: ThreadingHTTPServer | None = None
        self.started_at = time.monotonic()

    def _make_handler(self):
        runtime = self.runtime
        web_root = self.web_root

        class Handler(BaseHTTPRequestHandler):
            def setup(self) -> None:
                super().setup()
                self.connection.settimeout(10)

            def do_GET(self) -> None:  # noqa: N802
                parsed = urllib.parse.urlsplit(self.path)
                target = urllib.parse.unquote(parsed.path).rstrip("/") or "/"
                if target == "/health":
                    self._send_json(200, {"status": "ok", "version": __version__, "uptime": round(time.monotonic() - self.server.started_at, 2)})
                    return
                if target == "/capabilities":
                    self._send_json(200, runtime.capabilities())
                    return
                if target == "/models":
                    self._send_json(200, runtime.models())
                    return
                if target.startswith("/sessions/"):
                    session_id = target.removeprefix("/sessions/")
                    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", session_id):
                        self._send_json(400, {"error": "invalid_session_id"})
                        return
                    self._send_json(200, {"session_id": session_id,
                                          "messages": runtime.store.conversation_messages(session_id)})
                    return
                if target in {"/", "/index.html"}:
                    file_path = web_root / "index.html"
                    if file_path.exists():
                        self._send_file(file_path, "text/html; charset=utf-8")
                        return
                if target.startswith("/"):
                    file_path = (web_root / target.lstrip("/")).resolve()
                    try:
                        file_path.relative_to(web_root.resolve())
                    except ValueError:
                        self._send_json(404, {"error": "not_found", "path": target})
                        return
                    if not file_path.is_symlink() and file_path.is_file():
                        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
                        self._send_file(file_path, content_type)
                        return
                self._send_json(404, {"error": "not_found", "path": target})

            def do_POST(self) -> None:  # noqa: N802
                parsed = urllib.parse.urlsplit(self.path)
                target = urllib.parse.unquote(parsed.path).rstrip("/") or "/"
                if target != "/chat":
                    self._send_json(404, {"error": "not_found", "path": target})
                    return
                origin = self.headers.get("Origin")
                if origin:
                    parsed_origin = urllib.parse.urlsplit(origin)
                    if parsed_origin.scheme not in {"http", "https"} or parsed_origin.netloc.casefold() != self.headers.get("Host", "").casefold():
                        self._send_json(403, {"error": "cross_origin_denied"})
                        return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length <= 0:
                        raise ValueError("Request body is empty")
                    if length > OmegaHTTPService.MAX_BODY_BYTES:
                        self._send_json(413, {"error": "request_too_large"})
                        return
                    if self.headers.get_content_type() != "application/json":
                        self._send_json(415, {"error": "content_type_required"})
                        return
                    raw = self.rfile.read(length)
                    if len(raw) != length:
                        raise ValueError("Request body is incomplete")
                    payload = json.loads(raw.decode("utf-8"))
                    if not isinstance(payload, dict):
                        raise ValueError("JSON body must be an object")
                except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
                    self._send_json(400, {"error": "invalid_json", "message": "Expected a JSON object with a non-empty prompt field."})
                    return
                prompt = payload.get("prompt", "")
                if not isinstance(prompt, str) or not prompt.strip():
                    self._send_json(400, {"error": "invalid_prompt", "message": "The prompt field must be a non-empty string."})
                    return
                if len(prompt) > 2000:
                    self._send_json(413, {"error": "prompt_too_large", "message": "Prompt exceeds the 2000-character limit."})
                    return
                session_id = payload.get("session_id")
                if session_id is not None and (not isinstance(session_id, str)
                                               or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", session_id)):
                    self._send_json(400, {"error": "invalid_session_id"})
                    return
                try:
                    result = runtime.process_chat(prompt, session_id)
                except Exception as exc:
                    self._send_json(502, {"error": "chat_failed", "message": type(exc).__name__})
                    return
                result["model"] = runtime.provider_registry.active_provider_name if hasattr(runtime, "provider_registry") else "offline"
                self._send_json(200, result)

            def _send_json(self, status: int, payload: dict[str, Any]) -> None:
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)

            def _send_file(self, file_path: Path, content_type: str) -> None:
                try:
                    body = file_path.read_bytes()
                except OSError:
                    self._send_json(404, {"error": "missing_file", "path": str(file_path)})
                    return
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, format: str, *args: Any) -> None:
                return

        return Handler

    def start(self) -> ThreadingHTTPServer:
        self.server = ThreadingHTTPServer((self.host, self.port), self._make_handler())
        self.server.started_at = self.started_at
        self.port = self.server.server_address[1]
        return self.server

    def serve_forever(self) -> None:
        if self.server is None:
            self.start()
        self.server.serve_forever()

    def shutdown(self) -> None:
        if self.server is not None:
            self.server.shutdown()
            self.server.server_close()
            self.server = None
