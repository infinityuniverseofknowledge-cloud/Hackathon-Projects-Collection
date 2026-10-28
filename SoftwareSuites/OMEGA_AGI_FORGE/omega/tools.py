"""Small local tools with bounded input and explicit project-root permissions."""

from __future__ import annotations

import ast
import operator
import subprocess
import sys
from pathlib import Path
from typing import Any

from .security import ProjectFiles
from .storage import Store


_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def calculate(expression: str) -> int | float:
    if len(expression) > 160:
        raise ValueError("Expression is too long")
    tree = ast.parse(expression, mode="eval")

    def visit(node: ast.AST) -> int | float:
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.UnaryOp) and type(node.op) in _OPERATORS:
            return _OPERATORS[type(node.op)](visit(node.operand))
        if isinstance(node, ast.BinOp) and type(node.op) in _OPERATORS:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 8:
                raise ValueError("Exponent is limited to 8")
            result = _OPERATORS[type(node.op)](left, right)
            if abs(result) > 10**100:
                raise ValueError("Result exceeds the numeric limit")
            return result
        raise ValueError("Only basic arithmetic is supported")

    return visit(tree)


class ToolRegistry:
    def __init__(self, root: Path, store: Store):
        self.files = ProjectFiles(root)
        self.root = self.files.root
        self.store = store

    def list_files(self, path: str = ".", limit: int = 200) -> list[str]:
        if not 1 <= limit <= 1000:
            raise ValueError("Limit must be between 1 and 1000")
        directory = self.root if path == "." else self.files.resolve(path, must_exist=True)
        if not directory.is_dir():
            raise ValueError("Path is not a directory")
        output = []
        for child in sorted(directory.iterdir(), key=lambda item: item.name.casefold()):
            if self.files.is_sensitive(child.relative_to(self.root)) or child.name == "__pycache__":
                continue
            output.append(child.relative_to(self.root).as_posix())
            if len(output) >= limit:
                break
        return output

    def read_text(self, path: str, max_bytes: int = 1_000_000) -> str:
        target = self.files.resolve(path, must_exist=True)
        if not target.is_file() or target.stat().st_size > max_bytes:
            raise ValueError("Expected a file no larger than the configured limit")
        return target.read_text(encoding="utf-8", errors="replace")

    def write_text(self, path: str, content: str) -> None:
        if len(content.encode("utf-8")) > 1_000_000:
            raise ValueError("File content exceeds 1 MB")
        target = self.files.resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            raise FileExistsError("Refusing to overwrite an existing file")
        temporary = target.with_name(target.name + ".omega-tmp")
        try:
            temporary.write_text(content, encoding="utf-8")
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)

    def search_files(self, query: str, limit: int = 100) -> list[dict[str, Any]]:
        if not query or len(query) > 500:
            raise ValueError("Search query must contain 1 to 500 characters")
        if not 1 <= limit <= 1000:
            raise ValueError("Limit must be between 1 and 1000")
        matches = []
        for path in self.root.rglob("*"):
            if len(matches) >= limit:
                break
            if (self.files.is_sensitive(path.relative_to(self.root)) or path.is_symlink()
                    or not path.is_file()):
                continue
            try:
                if path.stat().st_size > 1_000_000:
                    continue
                content = path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                continue
            for line_number, line in enumerate(content.splitlines(), 1):
                if query.casefold() in line.casefold():
                    matches.append({"path": path.relative_to(self.root).as_posix(),
                                    "line": line_number, "text": line[:300]})
                    if len(matches) >= limit:
                        break
        return matches

    def index_knowledge(self, path: str = ".") -> dict[str, int]:
        start = self.files.resolve(path, must_exist=True)
        candidates = [start] if start.is_file() else start.rglob("*")
        indexed = skipped = considered = 0
        allowed = {".txt", ".md", ".py", ".js", ".ts", ".json", ".toml", ".yaml", ".yml", ".log", ".sh", ".sql", ".html", ".css"}
        for item in candidates:
            if item.is_symlink() or not item.is_file() or item.suffix.lower() not in allowed:
                continue
            if (self.files.is_sensitive(item.relative_to(self.root))
                    or any(part in {".venv", "__pycache__", "node_modules"}
                           for part in item.parts)):
                continue
            if considered >= 200:
                break
            considered += 1
            if item.stat().st_size > 200_000:
                skipped += 1
                continue
            try:
                content = item.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                skipped += 1
                continue
            relative = item.relative_to(self.root).as_posix()
            if self.store.index_document(relative, content):
                indexed += 1
        return {"indexed_or_updated": indexed, "unchanged_or_skipped": skipped,
            "max_documents": 200}

    def run_tests(self, timeout: int = 60, *, approved: bool = False) -> dict[str, Any]:
        if not approved:
            raise PermissionError("Project tests execute code as this user; pass explicit approval")
        if not 1 <= timeout <= 120:
            raise ValueError("Test timeout must be between 1 and 120 seconds")
        result = subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
            cwd=self.root, capture_output=True, text=True, timeout=timeout,
            env={"PATH": str(Path(sys.executable).parent), "PYTHONPATH": str(self.root)},
        )
        return {"returncode": result.returncode,
                "output": (result.stdout + result.stderr)[-12000:]}