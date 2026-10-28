from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .agents import AgentRegistry
from .config import OmegaConfig
from .planner import ExecutionController, Planner
from .providers import ProviderError, chat as provider_chat, configured_provider
from .storage import Store
from .tools import ToolRegistry, calculate


class OfflineProvider:
    name = "offline"

    def __init__(self) -> None:
        self.model = "offline"

    def is_available(self) -> bool:
        return True

    def generate(self, prompt: str) -> str:
        value = prompt.strip()
        if not value:
            return "No prompt was provided."
        try:
            number = calculate(value)
        except (SyntaxError, ValueError, OverflowError, ZeroDivisionError):
            return (
                "No language model is configured. Deterministic mode can safely evaluate arithmetic "
                "and keep local task state, but it cannot reason over arbitrary free-form text."
            )
        return f"Deterministic calculation: {number}"


@dataclass
class ProviderRegistry:
    config: OmegaConfig
    providers: dict[str, Any] = field(default_factory=dict)
    active_provider_name: str = "offline"

    def __post_init__(self) -> None:
        self.providers["offline"] = OfflineProvider()
        provider = configured_provider()
        if provider:
            self.providers["configured"] = provider
            self.active_provider_name = "configured"

    def current(self) -> Any:
        return self.providers.get(self.active_provider_name, self.providers["offline"])


class OmegaRuntime:
    def __init__(self, config: OmegaConfig | None = None) -> None:
        self.config = config or OmegaConfig()
        self.provider_registry = ProviderRegistry(self.config)
        self.agent_registry = AgentRegistry()
        self.planner = Planner(max_steps=self.config.max_plan_steps)
        self.store = Store(Path(self.config.project_root))
        self.store.initialize()
        self.tools = ToolRegistry(Path(self.config.project_root), self.store)

    def health(self) -> dict[str, Any]:
        provider = self.provider_registry.current()
        available = (provider.is_available() if hasattr(provider, "is_available")
                     else self.provider_registry.active_provider_name == "offline")
        return {
            "project_root": str(self.config.project_root),
            "storage_dir": str(self.config.storage_dir),
            "provider": self.provider_registry.active_provider_name,
            "provider_available": available,
            "provider_configured": self.provider_registry.active_provider_name == "configured",
            "database": str(self.store.database),
            "agents": self.agent_registry.list_roles(),
        }

    def capabilities(self) -> dict[str, Any]:
        provider = self.provider_registry.current()
        available = (provider.is_available() if hasattr(provider, "is_available")
                     else self.provider_registry.active_provider_name == "offline")
        return {
            "status": "ok",
            "capabilities": {
                "tool_runtime": True,
                "document_search": True,
                "persistent_memory": True,
                "task_planning": True,
                "offline_mode": True,
                "remote_provider": self.provider_registry.active_provider_name != "offline",
                "provider_available": available,
                "provider_configured": self.provider_registry.active_provider_name == "configured",
            },
            "provider": self.provider_registry.active_provider_name,
            "project_root": str(self.config.project_root),
        }

    def models(self) -> dict[str, Any]:
        providers = []
        for key, value in self.provider_registry.providers.items():
            name = getattr(value, "model", key)
            availability = getattr(value, "is_available", None)
            providers.append({
                "name": key,
                "model": name,
                "available": availability() if availability else key == "offline",
                "configured": key == "offline" or key == self.provider_registry.active_provider_name,
            })
        return {"models": providers, "active": self.provider_registry.active_provider_name}

    def chat(self, prompt: str) -> str:
        value = prompt.strip()
        lowered = value.casefold()
        search_prefixes = ("search:", "search documents:", "find in documents:")
        for prefix in search_prefixes:
            if lowered.startswith(prefix):
                query = value[len(prefix):].strip()
                results = self.store.search_documents(query)
                if not results:
                    return "No matching local documents were found. Index documents with `omega knowledge index <path>`."
                return "\n\n".join(
                    f"{item['path']} (score {item['score']}):\n{item['excerpt']}"
                    for item in results
                )
        if lowered.startswith("memory:"):
            query = value[7:].strip()
            results = self.store.search_memory(query)
            if not results:
                return "No matching saved memories were found."
            return "\n\n".join(
                f"Memory {item['id']} ({item['category']}): {item['content']}"
                for item in results
            )
        if lowered.startswith("files:"):
            path = value[6:].strip() or "."
            try:
                return json.dumps(self.tools.list_files(path), ensure_ascii=False, indent=2)
            except (OSError, PermissionError, ValueError) as exc:
                return f"File-list request rejected: {exc}"
        if lowered.startswith("read:"):
            path = value[5:].strip()
            if not path:
                return "Provide a project-relative file path after `read:`."
            try:
                return self.tools.read_text(path)
            except (OSError, PermissionError, ValueError) as exc:
                return f"File-read request rejected: {exc}"
        if lowered.startswith("plan:"):
            return json.dumps(self.plan(value[5:].strip()), ensure_ascii=False, indent=2)
        provider = self.provider_registry.current()
        if self.provider_registry.active_provider_name == "configured":
            return provider.generate(value) if hasattr(provider, "generate") else provider_chat(provider, value)
        return provider.generate(value)

    def process_chat(self, prompt: str, session_id: str | None = None) -> dict[str, str]:
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 20_000:
            raise ValueError("Prompt must contain 1 to 20000 characters")
        session_id = session_id or uuid.uuid4().hex
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", session_id):
            raise ValueError("Session ID may contain only letters, digits, underscores, or hyphens")
        self.store.add_conversation_message(session_id, "user", prompt.strip())
        try:
            response = self.chat(prompt)
        except ProviderError as exc:
            response = f"Configured provider unavailable ({exc}). No fallback model is installed."
        self.store.add_conversation_message(session_id, "assistant", response)
        return {"session_id": session_id, "response": response}

    def plan(self, goal: str) -> dict[str, Any]:
        plan = self.planner.create_plan(goal)
        return {
            "goal": plan.goal,
            "steps": [
                {"id": step.id, "title": step.title, "description": step.description,
                 "depends_on": sorted(step.depends_on), "status": step.status, "owner": step.owner}
                for step in plan.steps
            ],
            "status": plan.status,
        }

    def execute_plan(self, goal: str) -> dict[str, Any]:
        plan = self.planner.create_plan(goal)
        controller = ExecutionController(plan)

        def runner(step):
            return True

        result = controller.run(runner)
        return {
            "goal": result.goal,
            "status": result.status,
            "steps": [
                {"id": step.id, "title": step.title, "status": step.status}
                for step in result.steps
            ],
        }
