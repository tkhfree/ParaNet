"""Docker container runtime (sandboxed execution)."""
from __future__ import annotations

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


class DockerRuntime(Runtime):
    def __init__(
        self,
        image: str = "python:3.12-slim",
        workspace: str | None = None,
        default_timeout: int = 120,
    ):
        self.image = image
        self.workspace = workspace or "."
        self.default_timeout = default_timeout
        self._container = None

    def _ensure_container(self):
        if self._container is not None:
            return
        try:
            import docker

            client = docker.from_env()
            self._container = client.containers.run(
                self.image,
                command="tail -f /dev/null",
                detach=True,
                volumes={self.workspace: {"bind": "/workspace", "mode": "rw"}},
                working_dir="/workspace",
                mem_limit="2g",
                cpu_count=2,
            )
        except Exception as e:
            raise RuntimeError(f"Failed to start Docker container: {e}") from e

    def run(self, action: CmdRunAction) -> CmdOutputObservation:
        try:
            self._ensure_container()
            exit_code, output = self._container.exec_run(
                cmd=f"bash -c '{action.command}'",
                workdir="/workspace",
            )
            return CmdOutputObservation(
                content=output.decode("utf-8", errors="replace"),
                exit_code=exit_code,
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
            self._ensure_container()
            exit_code, output = self._container.exec_run(
                cmd=f"cat '{action.path}'",
                workdir="/workspace",
            )
            if exit_code != 0:
                return ErrorObservation(
                    content=output.decode("utf-8", errors="replace")
                )
            return FileReadObservation(
                content=output.decode("utf-8", errors="replace"),
                path=action.path,
            )
        except Exception as e:
            return ErrorObservation(content=str(e))

    def write(self, action: FileWriteAction) -> FileWriteObservation:
        try:
            self._ensure_container()
            import shlex

            escaped = shlex.quote(action.content)
            exit_code, output = self._container.exec_run(
                cmd=f"bash -c 'mkdir -p $(dirname {action.path}) && printf %s {escaped} > {action.path}'",
                workdir="/workspace",
            )
            return FileWriteObservation(
                content=(
                    f"Successfully wrote to {action.path}"
                    if exit_code == 0
                    else output.decode("utf-8", errors="replace")
                ),
                path=action.path,
            )
        except Exception as e:
            return FileWriteObservation(content=str(e), path=action.path)

    def edit(self, action: FileEditAction) -> FileEditObservation | ErrorObservation:
        try:
            self._ensure_container()
            read_obs = self.read(FileReadAction(path=action.path))
            if isinstance(read_obs, ErrorObservation):
                return read_obs
            content = read_obs.content
            if action.old_str not in content:
                return ErrorObservation(
                    content=f"old_str not found in {action.path}"
                )
            new_content = content.replace(action.old_str, action.new_str, 1)
            write_obs = self.write(
                FileWriteAction(path=action.path, content=new_content)
            )
            return FileEditObservation(content=write_obs.content, path=action.path)
        except Exception as e:
            return ErrorObservation(content=str(e))

    def close(self):
        if self._container:
            try:
                self._container.stop()
                self._container.remove()
            except Exception:
                pass
            self._container = None
