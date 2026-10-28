"""Durable local state using only SQLite from the Python standard library."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class _ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, project_root: Path):
        self.root = project_root.resolve()
        self.data_dir = self.root / ".omega"
        self.database = self.data_dir / "omega.sqlite3"

    def connect(self) -> sqlite3.Connection:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.database, timeout=5, factory=_ClosingConnection)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 5000")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    def initialize(self) -> None:
        with self.connect() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN (
                        'pending','running','blocked','completed','failed',
                        'cancelled','awaiting_approval')),
                    details TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    provenance TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS documents (
                    path TEXT PRIMARY KEY,
                    digest TEXT NOT NULL,
                    content TEXT NOT NULL,
                    indexed_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id INTEGER PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY,
                    task_id INTEGER,
                    kind TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS memories_category_idx
                    ON memories(category, created_at);
                CREATE INDEX IF NOT EXISTS conversation_session_idx
                    ON conversation_messages(session_id, id);
                CREATE INDEX IF NOT EXISTS events_task_idx ON events(task_id, id);
                """
            )

    def event(self, kind: str, data: dict[str, Any], task_id: int | None = None) -> None:
        with self.connect() as db:
            db.execute(
                "INSERT INTO events(task_id,kind,data,created_at) VALUES(?,?,?,?)",
                (task_id, kind, json.dumps(data, sort_keys=True), now()),
            )

    def add_task(self, title: str) -> int:
        if not title.strip():
            raise ValueError("Task title cannot be empty")
        stamp = now()
        with self.connect() as db:
            cursor = db.execute(
                "INSERT INTO tasks(title,status,created_at,updated_at) VALUES(?,?,?,?)",
                (title.strip(), "pending", stamp, stamp),
            )
            task_id = int(cursor.lastrowid)
            db.execute(
                "INSERT INTO events(task_id,kind,data,created_at) VALUES(?,?,?,?)",
                (task_id, "task.created", "{}", stamp),
            )
        return task_id

    def transition_task(self, task_id: int, status: str, details: dict[str, Any] | None = None) -> None:
        transitions = {
            "pending": {"running", "blocked", "cancelled"},
            "running": {"completed", "failed", "cancelled", "awaiting_approval"},
            "blocked": {"pending", "cancelled"},
            "failed": {"pending", "cancelled"},
            "awaiting_approval": {"pending", "cancelled"},
            "completed": set(),
            "cancelled": set(),
        }
        with self.connect() as db:
            row = db.execute("SELECT status FROM tasks WHERE id=?", (task_id,)).fetchone()
            if row is None:
                raise KeyError(f"Unknown task: {task_id}")
            previous = row["status"]
            if status not in transitions[previous]:
                raise ValueError(f"Invalid task transition: {previous} -> {status}")
            stamp = now()
            encoded = json.dumps(details or {}, sort_keys=True)
            db.execute(
                "UPDATE tasks SET status=?,details=?,updated_at=? WHERE id=?",
                (status, encoded, stamp, task_id),
            )
            db.execute(
                "INSERT INTO events(task_id,kind,data,created_at) VALUES(?,?,?,?)",
                (task_id, f"task.{status}", encoded, stamp),
            )

    def tasks(self, limit: int = 100) -> list[dict[str, Any]]:
        with self.connect() as db:
            return [dict(row) for row in db.execute(
                "SELECT * FROM tasks ORDER BY id DESC LIMIT ?", (limit,)
            )]

    def add_memory(self, content: str, category: str = "semantic", provenance: str = "user") -> int:
        if not content.strip():
            raise ValueError("Memory content cannot be empty")
        with self.connect() as db:
            cursor = db.execute(
                "INSERT INTO memories(category,content,provenance,created_at) VALUES(?,?,?,?)",
                (category, content.strip(), provenance[:200], now()),
            )
            return int(cursor.lastrowid)

    def search_memory(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        terms = {term.casefold() for term in query.split() if len(term) > 1}
        if not terms:
            return []
        with self.connect() as db:
            rows = db.execute("SELECT * FROM memories ORDER BY id DESC LIMIT 2000").fetchall()
        ranked = []
        for row in rows:
            text = row["content"].casefold()
            score = sum(text.count(term) for term in terms)
            if score:
                item = dict(row)
                item["score"] = score
                ranked.append(item)
        return sorted(ranked, key=lambda item: (-item["score"], -item["id"]))[:limit]

    def list_memories(self, limit: int = 100) -> list[dict[str, Any]]:
        with self.connect() as db:
            return [dict(row) for row in db.execute(
                "SELECT * FROM memories ORDER BY id DESC LIMIT ?", (limit,)
            )]

    def delete_memory(self, memory_id: int) -> bool:
        with self.connect() as db:
            cursor = db.execute("DELETE FROM memories WHERE id=?", (memory_id,))
            return cursor.rowcount > 0

    def add_conversation_message(self, session_id: str, role: str, content: str) -> int:
        if not session_id or len(session_id) > 64:
            raise ValueError("Session ID must contain 1 to 64 characters")
        if role not in {"user", "assistant"}:
            raise ValueError("Conversation role must be user or assistant")
        if not content.strip() or len(content) > 20_000:
            raise ValueError("Conversation content must contain 1 to 20000 characters")
        stamp = now()
        with self.connect() as db:
            cursor = db.execute(
                "INSERT INTO conversation_messages(session_id,role,content,created_at) VALUES(?,?,?,?)",
                (session_id, role, content, stamp),
            )
            return int(cursor.lastrowid)

    def conversation_messages(self, session_id: str, limit: int = 100) -> list[dict[str, Any]]:
        if not session_id or len(session_id) > 64:
            return []
        limit = max(1, min(int(limit), 500))
        with self.connect() as db:
            rows = db.execute(
                "SELECT id,session_id,role,content,created_at FROM conversation_messages "
                "WHERE session_id=? ORDER BY id DESC LIMIT ?",
                (session_id, limit),
            ).fetchall()
        return [dict(row) for row in reversed(rows)]

    def export_data(self) -> dict[str, Any]:
        with self.connect() as db:
            return {
                table: [dict(row) for row in db.execute(f"SELECT * FROM {table} ORDER BY 1")]
                for table in ("tasks", "memories", "documents", "conversation_messages", "events")
            }

    def index_document(self, relative_path: str, content: str) -> bool:
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        with self.connect() as db:
            existing = db.execute(
                "SELECT digest FROM documents WHERE path=?", (relative_path,)
            ).fetchone()
            if existing and existing["digest"] == digest:
                return False
            db.execute(
                "INSERT INTO documents(path,digest,content,indexed_at) VALUES(?,?,?,?) "
                "ON CONFLICT(path) DO UPDATE SET digest=excluded.digest, "
                "content=excluded.content,indexed_at=excluded.indexed_at",
                (relative_path, digest, content, now()),
            )
        return True

    def search_documents(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        terms = [term.casefold() for term in query.split() if len(term) > 1]
        if not terms:
            return []
        with self.connect() as db:
            rows = db.execute("SELECT path,content,indexed_at FROM documents").fetchall()
        results = []
        for row in rows:
            haystack = row["content"].casefold()
            score = sum(haystack.count(term) for term in terms)
            if score:
                excerpt = row["content"][:500].replace("\x00", "")
                results.append({**dict(row), "score": score, "excerpt": excerpt})
        return sorted(results, key=lambda item: (-item["score"], item["path"]))[:limit]

    def counts(self) -> dict[str, int]:
        with self.connect() as db:
            return {
                table: int(db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
                for table in ("tasks", "memories", "documents", "conversation_messages", "events")
            }