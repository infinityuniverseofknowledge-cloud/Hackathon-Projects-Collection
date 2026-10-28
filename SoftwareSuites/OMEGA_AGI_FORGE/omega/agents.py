from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class AgentRole:
    name: str
    purpose: str
    tool_capabilities: tuple[str, ...] = ()


class AgentRegistry:
    def __init__(self) -> None:
        self.roles: dict[str, AgentRole] = {
            "researcher": AgentRole("researcher", "Collect and compare evidence from local or external sources.", ("knowledge.search", "web.search")),
            "software_engineer": AgentRole("software_engineer", "Implement and modify code for the current task.", ("project.read", "project.write", "project.test")),
            "code_reviewer": AgentRole("code_reviewer", "Inspect patches for correctness, integration, and clarity.", ("project.read", "project.search")),
            "test_engineer": AgentRole("test_engineer", "Design, run, and verify regression checks.", ("project.test", "benchmark")),
            "security_auditor": AgentRole("security_auditor", "Review permission boundaries and safety constraints.", ("project.read", "security.audit")),
            "planner": AgentRole("planner", "Create bounded task plans and execution schedules.", ("task.plan", "task.list")),
            "documentation_writer": AgentRole("documentation_writer", "Summarize the work and update user-facing docs.", ("project.read", "project.write")),
        }

    def list_roles(self) -> list[dict[str, Any]]:
        return [
            {"name": role.name, "purpose": role.purpose, "tools": list(role.tool_capabilities)}
            for role in self.roles.values()
        ]

    def get(self, name: str) -> AgentRole:
        key = name.casefold()
        if key not in self.roles:
            raise KeyError(f"Unknown agent role: {name}")
        return self.roles[key]
