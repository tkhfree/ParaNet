"""EventStream wrapper that persists every event to FileStore."""
from __future__ import annotations

import threading

from paranet.agent.core.events.action import Action
from paranet.agent.core.events.event import Event, EventSource
from paranet.agent.core.events.observation import Observation
from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.persistence import event_serializer
from paranet.agent.core.persistence.file_store import FileStore


class PersistedEventStream:
    """Wraps EventStream — every add_event() also writes to disk."""

    def __init__(self, session_id: str, file_store: FileStore, delegate: EventStream | None = None):
        self.session_id = session_id
        self.file_store = file_store
        self.delegate = delegate or EventStream()
        self._lock = threading.Lock()

    def add_event(self, event: Event, source: EventSource) -> None:
        self.delegate.add_event(event, source)
        self._persist(event)

    def _persist(self, event: Event) -> None:
        with self._lock:
            path = f"{self.session_id}/events/{event.id:06d}.json"
            self.file_store.write(path, event_serializer.serialize(event))

    def subscribe(self, subscriber_id: EventStreamSubscriber, callback) -> None:
        self.delegate.subscribe(subscriber_id, callback)

    def unsubscribe(self, subscriber_id: EventStreamSubscriber) -> None:
        self.delegate.unsubscribe(subscriber_id)

    def get_events(self, start_id: int = 0, end_id: int | None = None) -> list[Event]:
        """Read persisted events back from storage."""
        files = self.file_store.list_files(f"{self.session_id}/events/")
        events: list[Event] = []
        for f in files:
            # Parse event id from filename: "session/events/000001.json" -> 1
            try:
                name = f.rsplit("/", 1)[-1]  # "000001.json"
                file_id = int(name.replace(".json", ""))
            except (ValueError, IndexError):
                continue
            if file_id < start_id or (end_id is not None and file_id > end_id):
                continue
            raw = self.file_store.read(f)
            event = event_serializer.deserialize(raw)
            event.id = file_id
            events.append(event)
        return events

    def replay_to_history(self) -> list[dict]:
        """Replay persisted events into the State.history dict format."""
        events = self.get_events()
        history: list[dict] = []
        for event in events:
            if isinstance(event, Action):
                history.append({"role": "assistant", "content": str(event)})
            elif isinstance(event, Observation):
                history.append({
                    "role": "tool",
                    "content": event.content,
                    "tool_name": type(event).__name__,
                })
        return history
