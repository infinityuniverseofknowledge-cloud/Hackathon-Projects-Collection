from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class Task:
    id: int
    title: str
    status: str = "pending"
    details: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=_utc_now)
    updated_at: str = field(default_factory=_utc_now)


class TaskScheduler:
    def __init__(self) -> None:
        self._tasks: dict[int, Task] = {}
        self._next_id = 1

    def create_task(self, title: str, details: dict[str, Any] | None = None) -> Task:
        task = Task(id=self._next_id, title=title.strip(), details=details or {})
        self._tasks[task.id] = task
        self._next_id += 1
        return task

    def start_task(self, task_id: int) -> Task:
        task = self._tasks[task_id]
        task.status = "running"
        task.updated_at = _utc_now()
        return task

    def complete_task(self, task_id: int, details: dict[str, Any] | None = None) -> Task:
        task = self._tasks[task_id]
        if details:
            task.details.update(details)
        task.status = "completed"
        task.updated_at = _utc_now()
        return task

    @property
    def tasks(self) -> list[Task]:
        return [self._tasks[key] for key in sorted(self._tasks)]

    def get_task(self, task_id: int) -> Task:
        return self._tasks[task_id]
