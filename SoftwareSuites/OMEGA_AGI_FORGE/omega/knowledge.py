from __future__ import annotations

import re
from pathlib import Path
from typing import Any


class KnowledgeIndex:
    def __init__(self, root_dir: str | Path = ".") -> None:
        self.root_dir = Path(root_dir).resolve()
        self.documents: dict[str, dict[str, Any]] = {}

    def add_document(self, source: str, content: str) -> dict[str, Any]:
        normalized = source.strip()
        entry = {
            "source": normalized,
            "content": content,
            "terms": {token for token in re.findall(r"[A-Za-z0-9_]+", content.casefold()) if len(token) > 1},
        }
        self.documents[normalized] = entry
        return entry

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        terms = [token for token in re.findall(r"[A-Za-z0-9_]+", query.casefold()) if len(token) > 1]
        if not terms:
            return []
        results: list[dict[str, Any]] = []
        for source, entry in self.documents.items():
            score = 0
            matches = []
            for term in terms:
                if term in entry["terms"]:
                    score += 1
                    matches.append(term)
            if score:
                excerpt = entry["content"][:200]
                results.append({"source": source, "score": score, "matches": matches, "excerpt": excerpt})
        results.sort(key=lambda item: (-item["score"], item["source"]))
        return results[:limit]
