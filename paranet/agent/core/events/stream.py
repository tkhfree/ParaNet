# paranet/agent/core/events/stream.py
"""EventStream — async event bus for agent communication."""
from __future__ import annotations

import threading
from collections import defaultdict
from enum import Enum
from typing import Callable

from paranet.agent.core.events.event import Event, EventSource


class EventStreamSubscriber(str, Enum):
    AGENT_CONTROLLER = "agent_controller"
    RUNTIME = "runtime"
    SSE_BRIDGE = "sse_bridge"


class EventStream:
    def __init__(self):
        self._subscribers: dict[EventStreamSubscriber, list[Callable]] = defaultdict(list)
        self._counter: int = 0
        self._lock = threading.Lock()

    def subscribe(self, subscriber_id: EventStreamSubscriber, callback: Callable):
        self._subscribers[subscriber_id].append(callback)

    def unsubscribe(self, subscriber_id: EventStreamSubscriber):
        self._subscribers.pop(subscriber_id, None)

    def add_event(self, event: Event, source: EventSource):
        with self._lock:
            self._counter += 1
            event.id = self._counter
        event.source = source
        for subscriber_id, callbacks in self._subscribers.items():
            for cb in callbacks:
                cb(event)
