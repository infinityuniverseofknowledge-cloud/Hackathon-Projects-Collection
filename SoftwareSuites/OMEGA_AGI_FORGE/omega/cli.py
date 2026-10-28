"""Command-line entry point for the offline-first OMEGA runtime."""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import tempfile
import uuid
from pathlib import Path

from . import __version__
from .agents import AgentRegistry
from .config import OmegaConfig
from .http_api import OmegaHTTPService
from .planner import Planner
from .providers import ProviderError, chat, configured_provider, display_endpoint
from .runtime import OmegaRuntime
from .storage import Store
from .tools import ToolRegistry, calculate


ROOT = Path(__file__).resolve().parent.parent


def _store(root: Path = ROOT) -> Store:
    store = Store(root)
    store.initialize()
    return store


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(prog="omega", description="Offline-first agent engineering tools")
    command.add_argument("--version", action="version", version=f"OMEGA {__version__}")
    sub = command.add_subparsers(dest="command", required=True)
    sub.add_parser("setup", help="initialize local SQLite state and safe example config")
    sub.add_parser("doctor", help="show environment and provider diagnostics")
    sub.add_parser("status", help="show local storage counts and provider state")
    sub.add_parser("providers", help="show explicitly configured provider")
    sub.add_parser("agents", help="list specialized agent roles")
    sub.add_parser("tools", help="list available local tools")
    serve = sub.add_parser("serve", help="start the local HTTP API and dashboard")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--web-root", default=str(ROOT / "web"))
    planner = sub.add_parser("plan", help="create a bounded execution plan for a goal")
    planner.add_argument("goal", nargs="*")
    chat_parser = sub.add_parser("chat", help="send one prompt or start an interactive session")
    chat_parser.add_argument("prompt", nargs="*")
    tasks = sub.add_parser("task", help="create or list durable tasks")
    tasks.add_argument("action", choices=("add", "list", "run"))
    tasks.add_argument("value", nargs="*")
    memory = sub.add_parser("memory", help="manage searchable local memory")
    memory.add_argument("action", choices=("add", "search", "list", "delete"))
    memory.add_argument("value", nargs="*")
    knowledge = sub.add_parser("knowledge", help="index and search local project documents")
    knowledge.add_argument("action", choices=("index", "search"))
    knowledge.add_argument("value", nargs="*")
    project = sub.add_parser("project", help="inspect project files or run its test suite")
    project.add_argument("action", choices=("analyze", "list", "read", "search", "write", "test"))
    project.add_argument("value", nargs="*")
    project.add_argument("--approve-test-execution", action="store_true",
                         help="run project tests with this user's permissions; no sandbox is available")
    benchmark = sub.add_parser("benchmark", help="run small deterministic smoke checks")
    benchmark.add_argument("--json", action="store_true")
    sub.add_parser("export", help="write local task, memory, knowledge, and event data as JSON to stdout")
    return command


def _chat(prompt: str, runtime: OmegaRuntime, session_id: str) -> str:
    return runtime.process_chat(prompt, session_id)["response"]


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    store = _store()
    tools = ToolRegistry(ROOT, store)
    if args.command == "setup":
        config = ROOT / "config.example.json"
        if not config.exists():
            config.write_text(json.dumps({"provider": {"mode": "offline"},
                                         "limits": {"max_plan_steps": 8,
                                                    "max_task_seconds": 120}}, indent=2) + "\n")
        print(f"Initialized local state at {store.database}")
        print("No model weights downloaded; no credentials required.")
    elif args.command == "doctor":
        print(json.dumps({"version": __version__, "python": sys.version.split()[0],
                          "platform": platform.platform(), "architecture": platform.machine(),
                          "project_root": str(ROOT), "writable": os.access(ROOT, os.W_OK),
                          "database": str(store.database),
                          "provider": "configured" if configured_provider() else "offline/unconfigured"}, indent=2))
    elif args.command == "status":
        print(json.dumps({"version": __version__, "counts": store.counts(),
                          "provider": "configured" if configured_provider() else "offline/unconfigured"}, indent=2))
    elif args.command == "providers":
        provider = configured_provider()
        print(json.dumps({"mode": "configured" if provider else "offline",
                          "endpoint": display_endpoint(provider.base_url) if provider else None,
                          "model": provider.model if provider else None,
                          "credential": "present" if provider and provider.api_key else "not set"}, indent=2))
    elif args.command == "agents":
        print(json.dumps(AgentRegistry().list_roles(), indent=2))
    elif args.command == "plan":
        goal = " ".join(args.goal).strip()
        if not goal:
            raise SystemExit("plan requires a natural-language goal")
        print(json.dumps(Planner(max_steps=8).create_plan(goal), default=lambda item: item.__dict__ if hasattr(item, "__dict__") else str(item), indent=2))
    elif args.command == "tools":
          print("calculate, project.list_files, project.read_text, project.write_new_text, "
              "project.search_files, knowledge.index, knowledge.search, project.run_tests")
    elif args.command == "serve":
        runtime = OmegaRuntime(OmegaConfig(project_root=ROOT))
        service = OmegaHTTPService(runtime, host=args.host, port=args.port, web_root=args.web_root)
        server = service.start()
        print(json.dumps({"status": "serving", "host": args.host, "port": server.server_address[1], "web": args.web_root}, indent=2))
        try:
            service.serve_forever()
        except KeyboardInterrupt:
            service.shutdown()
            print("Server stopped.")
        return 0
    elif args.command == "chat":
        runtime = OmegaRuntime(OmegaConfig(project_root=ROOT))
        if args.prompt:
            print(_chat(" ".join(args.prompt), runtime, uuid.uuid4().hex))
        else:
            print("OMEGA deterministic chat. Type /quit to exit.")
            session_id = uuid.uuid4().hex
            while True:
                try:
                    line = input("you> ").strip()
                except (EOFError, KeyboardInterrupt):
                    print()
                    break
                if line.casefold() in {"/quit", "/exit"}:
                    break
                if line:
                    print("omega>", _chat(line, runtime, session_id))
    elif args.command == "task":
        if args.action == "add":
            task_id = store.add_task(" ".join(args.value))
            print(f"Created pending task {task_id}")
        elif args.action == "run":
            if not args.value or not args.value[0].isdigit():
                raise SystemExit("task run requires a numeric task ID")
            task_id = int(args.value[0])
            store.transition_task(task_id, "running")
            store.transition_task(task_id, "awaiting_approval",
                                  {"note": "No autonomous execution is enabled in this release."})
            print(f"Task {task_id} is awaiting approval; no actions were executed.")
        elif args.action == "plan":
            goal = " ".join(args.value).strip()
            if not goal:
                raise SystemExit("task plan requires a natural-language goal")
            plan = Planner(max_steps=8).create_plan(goal)
            print(json.dumps({
                "goal": plan.goal,
                "max_steps": plan.max_steps,
                "steps": [{"id": step.id, "title": step.title, "description": step.description,
                           "depends_on": sorted(step.depends_on), "status": step.status}
                          for step in plan.steps],
            }, indent=2))
        else:
            print(json.dumps(store.tasks(), indent=2))
    elif args.command == "memory":
        if args.action == "add":
            if os.environ.get("OMEGA_MEMORY_DISABLED") == "1":
                raise SystemExit("Memory is disabled by OMEGA_MEMORY_DISABLED=1")
            memory_id = store.add_memory(" ".join(args.value))
            print(f"Stored user-requested memory {memory_id}")
        elif args.action == "search":
            print(json.dumps(store.search_memory(" ".join(args.value)), indent=2))
        elif args.action == "delete":
            if not args.value or not args.value[0].isdigit():
                raise SystemExit("memory delete requires a numeric memory ID")
            print("Deleted" if store.delete_memory(int(args.value[0])) else "Memory not found")
        else:
            print(json.dumps(store.list_memories(), indent=2))
    elif args.command == "knowledge":
        if args.action == "index":
            path = " ".join(args.value) or "."
            print(json.dumps(tools.index_knowledge(path), indent=2))
        else:
            print(json.dumps(store.search_documents(" ".join(args.value)), indent=2))
    elif args.command == "project":
        if args.action == "test":
            if not args.approve_test_execution:
                raise SystemExit("Project tests execute code with your permissions. Review the files and pass --approve-test-execution.")
            result = tools.run_tests(approved=True)
            print(result["output"])
            return int(result["returncode"] != 0)
        if args.action == "list":
            path = args.value[0] if args.value else "."
            print(json.dumps(tools.list_files(path, 1000), indent=2))
        elif args.action == "read":
            if not args.value:
                raise SystemExit("project read requires a relative project path")
            print(tools.read_text(args.value[0]), end="")
        elif args.action == "search":
            if not args.value:
                raise SystemExit("project search requires a query")
            print(json.dumps(tools.search_files(" ".join(args.value)), indent=2))
        elif args.action == "write":
            if len(args.value) < 2:
                raise SystemExit("project write requires a relative path and content")
            tools.write_text(args.value[0], " ".join(args.value[1:]))
            print(f"Created {args.value[0]}; existing files are never overwritten.")
        if args.action != "analyze":
            return 0
        files = tools.list_files(".", 1000)
        print(json.dumps({"root": str(ROOT), "files": len(files),
                          "top_level": files[:50]}, indent=2))
    elif args.command == "benchmark":
        with tempfile.TemporaryDirectory(prefix="omega-benchmark-") as temporary:
            benchmark_store = Store(Path(temporary))
            benchmark_store.initialize()
            checks = {"arithmetic": calculate("(2 + 3) * 4") == 20,
                      "sqlite": benchmark_store.counts() is not None,
                      "memory_search": True}
            benchmark_store.add_memory("OMEGA benchmark retrieval marker", category="benchmark",
                                       provenance="local benchmark")
            checks["memory_search"] = bool(benchmark_store.search_memory("benchmark retrieval marker"))
        report = {"checks": checks, "passed": sum(checks.values()), "total": len(checks)}
        print(json.dumps(report, indent=2) if args.json else
              f"Deterministic smoke checks: {report['passed']}/{report['total']} passed")
        return int(not all(checks.values()))
    elif args.command == "export":
        print(json.dumps(store.export_data(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())