"""Backend emitter interface."""

from __future__ import annotations

from abc import ABC, abstractmethod

from compiler.ir import NodePlanIR


class BackendEmitter(ABC):
    """Emits device code from NodePlanIR."""

    @abstractmethod
    def emit(self, plan: NodePlanIR) -> str:
        """Emit P4/entry code for the given node plan."""
        ...
