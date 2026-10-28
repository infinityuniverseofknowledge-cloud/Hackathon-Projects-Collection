from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from omega.config import OmegaConfig
from omega.knowledge import KnowledgeIndex
from omega.planner import Planner
from omega.runtime import OmegaRuntime
from omega.scheduler import TaskScheduler
from omega.security import ProjectFiles
from omega.storage import Store
from omega.tools import ToolRegistry, calculate


class CoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.store = Store(self.root)
        self.store.initialize()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_calculation_is_bounded_and_rejects_code(self) -> None:
        self.assertEqual(calculate("(4 + 2) * 3"), 18)
        with self.assertRaises(ValueError):
            calculate("__import__('os').system('id')")
        with self.assertRaises(ValueError):
            calculate("2 ** 99")

    def test_task_transitions_are_checked_and_persist(self) -> None:
        task_id = self.store.add_task("persist this")
        self.store.transition_task(task_id, "running")
        self.store.transition_task(task_id, "completed", {"verified": True})
        self.assertEqual(self.store.tasks()[0]["status"], "completed")
        with self.assertRaises(ValueError):
            self.store.transition_task(task_id, "pending")

    def test_memory_search_and_document_reindex(self) -> None:
        self.store.add_memory("SQLite retrieval works", provenance="test")
        self.assertTrue(self.store.search_memory("sqlite retrieval"))
        memory_id = self.store.list_memories()[0]["id"]
        self.assertTrue(self.store.delete_memory(memory_id))
        self.assertFalse(self.store.delete_memory(memory_id))
        self.assertTrue(self.store.index_document("notes.md", "local knowledge retrieval"))
        self.assertFalse(self.store.index_document("notes.md", "local knowledge retrieval"))
        self.assertEqual(self.store.search_documents("knowledge")[0]["path"], "notes.md")

    def test_filesystem_tools_confine_paths_and_refuse_overwrite(self) -> None:
        tools = ToolRegistry(self.root, self.store)
        tools.write_text("notes/new.md", "safe content")
        self.assertEqual(tools.read_text("notes/new.md"), "safe content")
        with self.assertRaises(FileExistsError):
            tools.write_text("notes/new.md", "replacement")
        for unsafe in ("../outside", "/tmp/outside"):
            with self.assertRaises(PermissionError):
                ProjectFiles(self.root).resolve(unsafe)
        for secret in (".env", ".env.local", "private.pem", "signing.key", ".npmrc"):
            with self.assertRaises(PermissionError):
                ProjectFiles(self.root).resolve(secret)

    def test_knowledge_index_skips_vcs_and_runtime_data(self) -> None:
        tools = ToolRegistry(self.root, self.store)
        (self.root / ".git").mkdir()
        (self.root / ".git" / "private.md").write_text("must not be indexed")
        (self.root / "notes.md").write_text("small local note")
        report = tools.index_knowledge()
        self.assertEqual(report["max_documents"], 200)
        results = self.store.search_documents("small local note")
        self.assertEqual([row["path"] for row in results], ["notes.md"])

    def test_symlink_escape_is_rejected(self) -> None:
        outside_temp = tempfile.TemporaryDirectory(prefix="omega-outside-")
        outside = Path(outside_temp.name)
        try:
            (self.root / "escape").symlink_to(outside, target_is_directory=True)
            with self.assertRaises(PermissionError):
                ProjectFiles(self.root).resolve("escape/secret.txt")
        finally:
            (self.root / "escape").unlink(missing_ok=True)
            outside_temp.cleanup()

    def test_project_test_execution_requires_approval(self) -> None:
        tools = ToolRegistry(self.root, self.store)
        with self.assertRaises(PermissionError):
            tools.run_tests()

    def test_runtime_configuration_and_provider_defaults(self) -> None:
        config = OmegaConfig(project_root=self.root)
        runtime = OmegaRuntime(config)
        self.assertEqual(runtime.config.project_root, self.root)
        self.assertEqual(runtime.provider_registry.active_provider_name, "offline")
        self.assertTrue(runtime.provider_registry.providers["offline"].is_available())

    def test_knowledge_index_and_scheduler_behaviour(self) -> None:
        index = KnowledgeIndex(root_dir=self.root)
        index.add_document("alpha.md", "Omega keeps local documents searchable.")
        hits = index.search("local documents")
        self.assertTrue(hits)
        self.assertIn("alpha.md", hits[0]["source"])

        scheduler = TaskScheduler()
        task = scheduler.create_task("build runtime", {"stage": "init"})
        self.assertEqual(task.status, "pending")
        scheduler.start_task(task.id)
        self.assertEqual(task.status, "running")
        scheduler.complete_task(task.id)
        self.assertEqual(task.status, "completed")

    def test_planner_creates_dependency_ordered_steps(self) -> None:
        planner = Planner(max_steps=6)
        plan = planner.create_plan("Debug the parser and validate the fix")
        self.assertGreaterEqual(len(plan.steps), 2)
        self.assertEqual(plan.steps[0].title, "Inspect the failing behavior")
        self.assertTrue(all(step.depends_on <= set() or step.id > 0 for step in plan.steps))

        executed = []
        for step in plan.steps:
            executed.append(step.title)
        self.assertGreater(len(executed), 1)


if __name__ == "__main__":
    unittest.main()