"""Local subprocess runtime (no sandbox)."""
from __future__ import annotations

import subprocess
from pathlib import Path

from paranet.agent.core.runtime.base import Runtime
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
    ErrorObservation,
)


class LocalRuntime(Runtime):
    def __init__(self, workspace: str | None = None, default_timeout: int = 120):
        self.workspace = workspace or "."
        self.default_timeout = default_timeout

    def run(self, action: CmdRunAction) -> CmdOutputObservation:
        timeout = action.timeout or self.default_timeout
        try:
            result = subprocess.run(
                action.command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.workspace,
            )
            return CmdOutputObservation(
                content=result.stdout + result.stderr,
                exit_code=result.returncode,
                command=action.command,
            )
        except subprocess.TimeoutExpired:
            return CmdOutputObservation(
                content=f"Command timed out after {timeout}s",
                exit_code=-1,
                command=action.command,
            )
        except Exception as e:
            return CmdOutputObservation(
                content=str(e),
                exit_code=-1,
                command=action.command,
            )

    def read(self, action: FileReadAction) -> FileReadObservation | ErrorObservation:
        try:
            path = Path(action.path)
            if not path.exists():
                return ErrorObservation(content=f"File not found: {action.path}")
            content = path.read_text()
            return FileReadObservation(content=content, path=action.path)
        except Exception as e:
            return ErrorObservation(content=str(e))

    def write(self, action: FileWriteAction) -> FileWriteObservation:
        try:
            path = Path(action.path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(action.content)
            return FileWriteObservation(
                content=f"Successfully wrote to {action.path}",
                path=action.path,
            )
        except Exception as e:
            return FileWriteObservation(
                content=f"Write failed: {e}",
                path=action.path,
            )

    def edit(self, action: FileEditAction) -> FileEditObservation | ErrorObservation:
        try:
            path = Path(action.path)
            if not path.exists():
                return ErrorObservation(content=f"File not found: {action.path}")
            content = path.read_text()
            if action.old_str not in content:
                return ErrorObservation(
                    content=f"old_str not found in {action.path}"
                )
            new_content = content.replace(action.old_str, action.new_str, 1)
            path.write_text(new_content)
            return FileEditObservation(
                content=f"Successfully edited {action.path}",
                path=action.path,
            )
        except Exception as e:
            return ErrorObservation(content=str(e))
