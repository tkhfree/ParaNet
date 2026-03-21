"""Backend emitter interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from compiler.backend.emit_context import EmitContext


class BackendEmitter(ABC):
    """Emits target-specific P4 and table-entry descriptors from NodePlanIR + fragments."""

    @abstractmethod
    def emit(self, ctx: EmitContext) -> str:
        """Emit P4 source for the given node plan."""
        ...

    @abstractmethod
    def emit_entries(self, ctx: EmitContext) -> dict[str, Any]:
        """Emit JSON-serializable table entry descriptors for control plane / deployment."""
        ...
