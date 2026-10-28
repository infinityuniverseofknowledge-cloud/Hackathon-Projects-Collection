"""Filesystem boundary checks shared by local tools."""

from pathlib import Path


class ProjectFiles:
    def __init__(self, root: Path):
        self.root = root.resolve()

    @staticmethod
    def is_sensitive(path: Path) -> bool:
        for part in path.parts:
            name = part.casefold()
            if (name in {".omega", ".git", ".env", ".npmrc", ".pypirc",
                         "credentials", "id_rsa", "id_ed25519"}
                    or name.startswith(".env.") or name.endswith((".pem", ".key"))):
                return True
        return False

    def resolve(self, value: str, *, must_exist: bool = False) -> Path:
        candidate = Path(value)
        if candidate.is_absolute():
            raise PermissionError("Absolute paths are not accepted by project tools")
        if any(part in ("..", "") for part in candidate.parts):
            raise PermissionError("Path traversal is not allowed")
        if self.is_sensitive(candidate):
            raise PermissionError("Sensitive or runtime paths are not available to project tools")
        target = self.root / candidate
        current = self.root
        for part in candidate.parts:
            current = current / part
            if current.is_symlink():
                raise PermissionError("Symbolic links are not allowed by project tools")
        resolved = target.resolve(strict=must_exist)
        try:
            resolved.relative_to(self.root)
        except ValueError as exc:
            raise PermissionError("Path escapes the project directory") from exc
        return resolved