"""File storage abstraction for event persistence."""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class FileStore(ABC):
    """Abstract file store — pluggable storage backend."""

    @abstractmethod
    def write(self, path: str, content: str) -> None: ...

    @abstractmethod
    def read(self, path: str) -> str: ...

    @abstractmethod
    def list_files(self, prefix: str) -> list[str]: ...

    @abstractmethod
    def delete(self, path: str) -> None: ...

    @abstractmethod
    def exists(self, path: str) -> bool: ...


class InMemoryFileStore(FileStore):
    """Dict-backed store for tests."""

    def __init__(self) -> None:
        self._files: dict[str, str] = {}

    def write(self, path: str, content: str) -> None:
        self._files[path] = content

    def read(self, path: str) -> str:
        if path not in self._files:
            raise FileNotFoundError(path)
        return self._files[path]

    def list_files(self, prefix: str) -> list[str]:
        return sorted(p for p in self._files if p.startswith(prefix))

    def delete(self, path: str) -> None:
        self._files.pop(path, None)

    def exists(self, path: str) -> bool:
        return path in self._files


class LocalFileStore(FileStore):
    """OS filesystem store rooted at *root_dir*."""

    def __init__(self, root_dir: str | Path) -> None:
        self._root = Path(root_dir).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, path: str) -> Path:
        resolved = (self._root / path).resolve()
        if ".." in Path(path).parts:
            raise ValueError(f"path traversal rejected: {path}")
        if not str(resolved).startswith(str(self._root)):
            raise ValueError(f"path escapes root: {path}")
        return resolved

    def write(self, path: str, content: str) -> None:
        target = self._resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".tmp")
        tmp.write_text(content, encoding="utf-8")
        tmp.replace(target)

    def read(self, path: str) -> str:
        target = self._resolve(path)
        if not target.exists():
            raise FileNotFoundError(str(target))
        return target.read_text(encoding="utf-8")

    def list_files(self, prefix: str) -> list[str]:
        target = self._resolve(prefix)
        if not target.exists():
            return []
        if target.is_file():
            rel = target.relative_to(self._root)
            return [str(rel).replace("\\", "/")]
        results: list[str] = []
        for p in sorted(target.rglob("*")):
            if p.is_file():
                rel = p.relative_to(self._root)
                results.append(str(rel).replace("\\", "/"))
        return results

    def delete(self, path: str) -> None:
        target = self._resolve(path)
        if target.exists():
            target.unlink()

    def exists(self, path: str) -> bool:
        return self._resolve(path).exists()
