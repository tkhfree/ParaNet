from __future__ import annotations
from paranet.agent.core.events.action import FileReadAction, FileWriteAction, FileEditAction
from paranet.agent.core.events.observation import FileReadObservation, FileWriteObservation
from paranet.agent.core.runtime.base import Runtime


class FileToolHandler:
    def __init__(self, runtime: Runtime):
        self.runtime = runtime

    def handle_read(self, action: FileReadAction):
        return self.runtime.read(action)

    def handle_write(self, action: FileWriteAction):
        return self.runtime.write(action)

    def handle_edit(self, action: FileEditAction):
        return self.runtime.edit(action)
