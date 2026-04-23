"""Abstract runtime base class."""
from __future__ import annotations

from abc import ABC, abstractmethod

from paranet.agent.core.events.action import (
    CmdRunAction,
    FileReadAction,
    FileWriteAction,
    FileEditAction,
)
from paranet.agent.core.events.observation import (
    CmdOutputObservation,
    FileReadObservation,
    FileWriteObservation,
    FileEditObservation,
)


class Runtime(ABC):
    @abstractmethod
    def run(self, action: CmdRunAction) -> CmdOutputObservation:
        ...

    @abstractmethod
    def read(self, action: FileReadAction) -> FileReadObservation:
        ...

    @abstractmethod
    def write(self, action: FileWriteAction) -> FileWriteObservation:
        ...

    @abstractmethod
    def edit(self, action: FileEditAction) -> FileEditObservation:
        ...

    def close(self):
        pass
