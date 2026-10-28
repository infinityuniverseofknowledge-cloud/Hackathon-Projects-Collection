from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class OmegaConfig:
    project_root: Path | str = "."
    storage_dir: Path | str | None = None
    max_plan_steps: int = 8
    max_tool_calls: int = 25
    max_task_seconds: int = 120
    provider_mode: str = "offline"
    provider_base_url: str = ""
    provider_model: str = ""
    provider_api_key: str = ""
    allow_remote: bool = False

    def __post_init__(self) -> None:
        self.project_root = Path(self.project_root).resolve()
        if self.storage_dir is None:
            self.storage_dir = self.project_root / ".omega"
        else:
            self.storage_dir = Path(self.storage_dir).resolve()

    @classmethod
    def load(cls, path: str | Path | None = None) -> "OmegaConfig":
        candidate = Path(path) if path else Path("config.example.json")
        if not candidate.exists():
            return cls()
        data = json.loads(candidate.read_text(encoding="utf-8"))
        return cls(
            project_root=data.get("project_root", "."),
            storage_dir=data.get("storage_dir"),
            max_plan_steps=data.get("limits", {}).get("max_plan_steps", 8),
            max_tool_calls=data.get("limits", {}).get("max_tool_calls", 25),
            max_task_seconds=data.get("limits", {}).get("max_task_seconds", 120),
            provider_mode=data.get("provider", {}).get("mode", "offline"),
            provider_base_url=data.get("provider", {}).get("base_url", ""),
            provider_model=data.get("provider", {}).get("model", ""),
            provider_api_key=data.get("provider", {}).get("api_key", ""),
            allow_remote=bool(data.get("provider", {}).get("allow_remote", False)),
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "project_root": str(self.project_root),
            "storage_dir": str(self.storage_dir),
            "max_plan_steps": self.max_plan_steps,
            "max_tool_calls": self.max_tool_calls,
            "max_task_seconds": self.max_task_seconds,
            "provider": {"mode": self.provider_mode, "base_url": self.provider_base_url,
                         "model": self.provider_model, "api_key": bool(self.provider_api_key),
                         "allow_remote": self.allow_remote},
        }
