"""Session metadata management backed by FileStore."""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

from paranet.agent.core.persistence.file_store import FileStore


@dataclass
class SessionMetadata:
    session_id: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "running"
    agent_state: str = "running"
    iteration: int = 0
    max_iterations: int = 30
    event_count: int = 0
    user_message: str = ""
    extra_data: dict = field(default_factory=dict)


class SessionStore:
    """CRUD for session metadata backed by FileStore."""

    def __init__(self, file_store: FileStore) -> None:
        self.file_store = file_store

    def save(self, meta: SessionMetadata) -> None:
        meta.updated_at = datetime.now(timezone.utc).isoformat()
        path = f"{meta.session_id}/metadata.json"
        self.file_store.write(path, json.dumps(asdict(meta), ensure_ascii=False, default=str))

    def load(self, session_id: str) -> SessionMetadata | None:
        path = f"{session_id}/metadata.json"
        if not self.file_store.exists(path):
            return None
        raw = self.file_store.read(path)
        d = json.loads(raw)
        valid = {k: v for k, v in d.items() if k in SessionMetadata.__dataclass_fields__}
        return SessionMetadata(**valid)

    def list_sessions(self) -> list[SessionMetadata]:
        results: list[SessionMetadata] = []
        for path in self.file_store.list_files(""):
            if path.endswith("/metadata.json"):
                session_id = path.split("/")[0]
                meta = self.load(session_id)
                if meta:
                    results.append(meta)
        return results

    def delete(self, session_id: str) -> None:
        for f in self.file_store.list_files(f"{session_id}/"):
            self.file_store.delete(f)
