"""Base event class for the agent event system."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import ClassVar


class EventSource(str, Enum):
    AGENT = "agent"
    USER = "user"
    ENVIRONMENT = "environment"


@dataclass
class Event:
    INVALID_ID: ClassVar[int] = -1

    _id: int = field(default=-1, init=False)
    _timestamp: str = field(default="", init=False)
    _source: EventSource = field(default=EventSource.USER, init=False)
    _cause: int | None = field(default=None, init=False)

    def __post_init__(self):
        if not self._timestamp:
            self._timestamp = datetime.now(timezone.utc).isoformat()

    @property
    def id(self) -> int:
        return self._id

    @id.setter
    def id(self, value: int):
        self._id = value

    @property
    def timestamp(self) -> str:
        return self._timestamp

    @property
    def source(self) -> EventSource:
        return self._source

    @source.setter
    def source(self, value: EventSource):
        self._source = value

    @property
    def cause(self) -> int | None:
        return self._cause

    @cause.setter
    def cause(self, value: int | None):
        self._cause = value
