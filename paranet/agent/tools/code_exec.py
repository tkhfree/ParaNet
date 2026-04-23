from __future__ import annotations
from paranet.agent.core.events.action import CmdRunAction, IPythonRunCellAction
from paranet.agent.core.events.observation import CmdOutputObservation
from paranet.agent.core.runtime.base import Runtime


class CodeExecToolHandler:
    def __init__(self, runtime: Runtime):
        self.runtime = runtime

    def handle_cmd(self, action: CmdRunAction) -> CmdOutputObservation:
        return self.runtime.run(action)

    def handle_python(self, action: IPythonRunCellAction) -> CmdOutputObservation:
        cmd_action = CmdRunAction(command=f"python3 -c {action.code!r}")
        return self.runtime.run(cmd_action)
