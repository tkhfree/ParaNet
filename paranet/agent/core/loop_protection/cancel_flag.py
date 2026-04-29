"""Thread-safe cancellation signal for the agent loop."""
from __future__ import annotations

import threading


class CancelFlag:
    """Thread-safe flag — any thread can cancel the agent loop."""

    def __init__(self) -> None:
        self._event = threading.Event()

    def cancel(self) -> None:
        self._event.set()

    @property
    def is_cancelled(self) -> bool:
        return self._event.is_set()

    def reset(self) -> None:
        self._event.clear()
