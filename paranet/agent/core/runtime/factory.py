"""Runtime factory -- auto-detect Docker or fall back to local."""
from __future__ import annotations

import logging
import subprocess

from paranet.agent.core.runtime.base import Runtime
from paranet.agent.core.runtime.local_runtime import LocalRuntime
from paranet.agent.core.runtime.docker_runtime import DockerRuntime

logger = logging.getLogger(__name__)


class RuntimeFactory:
    @staticmethod
    def create(
        force: str | None = None,
        workspace: str | None = None,
        default_timeout: int = 120,
    ) -> Runtime:
        if force == "local":
            logger.info("Using local runtime (forced)")
            return LocalRuntime(workspace=workspace, default_timeout=default_timeout)

        if force == "docker":
            logger.info("Using Docker runtime (forced)")
            return DockerRuntime(workspace=workspace, default_timeout=default_timeout)

        if RuntimeFactory._docker_available():
            logger.info("Docker available -- using Docker runtime")
            return DockerRuntime(workspace=workspace, default_timeout=default_timeout)

        logger.warning("Docker not available -- falling back to local runtime")
        return LocalRuntime(workspace=workspace, default_timeout=default_timeout)

    @staticmethod
    def _docker_available() -> bool:
        try:
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
