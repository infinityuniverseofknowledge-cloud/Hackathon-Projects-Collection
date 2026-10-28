from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class PlanStep:
    id: int
    title: str
    description: str
    depends_on: set[int] = field(default_factory=set)
    owner: str = "planner"
    status: str = "pending"


@dataclass
class TaskPlan:
    goal: str
    steps: list[PlanStep]
    max_steps: int = 8
    status: str = "planned"


class Planner:
    def __init__(self, max_steps: int = 8) -> None:
        self.max_steps = max_steps

    def _default_plan(self, goal: str) -> list[PlanStep]:
        goal_text = goal.strip()
        if not goal_text:
            raise ValueError("Plan goal cannot be empty")

        lowered = goal_text.casefold()
        if any(token in lowered for token in ("debug", "fix", "broken", "bug", "parser", "error")):
            titles = [
                ("Inspect the failing behavior", "Capture the symptom, inputs, and expected result."),
                ("Implement the fix", "Apply the minimal change that addresses the root cause."),
                ("Validate the fix", "Run the relevant checks to confirm correctness."),
            ]
        elif any(token in lowered for token in ("research", "analyze", "investigate", "study")):
            titles = [
                ("Gather source material", "Collect the relevant files, examples, and evidence."),
                ("Analyze the findings", "Compare the evidence and identify the main constraint."),
                ("Write the conclusion", "Summarize the result with clear evidence and caveats."),
            ]
        elif any(token in lowered for token in ("build", "create", "add", "write", "implement")):
            titles = [
                ("Review requirements", "Clarify the required functionality and constraints."),
                ("Implement the change", "Write the focused code or content needed."),
                ("Verify the outcome", "Check that the result satisfies the expected behavior."),
            ]
        else:
            titles = [
                ("Assess the task", "Clarify the goal, scope, and any constraints."),
                ("Carry out the work", "Execute the required action with minimal scope."),
                ("Verify the results", "Check the outcome against the objective."),
            ]

        steps: list[PlanStep] = []
        for index, (title, description) in enumerate(titles, start=1):
            depends_on = {index - 1} if index > 1 else set()
            steps.append(PlanStep(id=index, title=title, description=description, depends_on=depends_on))
        return steps[: self.max_steps]

    def create_plan(self, goal: str, *, context: dict[str, Any] | None = None) -> TaskPlan:
        steps = self._default_plan(goal)
        for step in steps:
            if context and "owner" in context:
                step.owner = str(context["owner"])
        return TaskPlan(goal=goal.strip(), steps=steps, max_steps=self.max_steps)


class ExecutionController:
    def __init__(self, plan: TaskPlan) -> None:
        self.plan = plan

    def run(self, runner: Callable[[PlanStep], bool], *, max_iterations: int | None = None) -> TaskPlan:
        max_iterations = max_iterations or len(self.plan.steps)
        completed = set()
        remaining = {step.id for step in self.plan.steps}

        for _ in range(max_iterations):
            progressed = False
            for step in self.plan.steps:
                if step.status == "completed":
                    continue
                if step.depends_on and not step.depends_on.issubset(completed):
                    continue
                step.status = "running"
                succeeded = bool(runner(step))
                if succeeded:
                    step.status = "completed"
                    completed.add(step.id)
                    remaining.discard(step.id)
                    self.plan.status = "in_progress" if remaining else "completed"
                    progressed = True
                else:
                    step.status = "blocked"
                    self.plan.status = "blocked"
                    return self.plan
            if not progressed:
                break
        if not remaining:
            self.plan.status = "completed"
        elif self.plan.status == "planned":
            self.plan.status = "in_progress"
        return self.plan
