from __future__ import annotations

import asyncio
import os
from pathlib import Path
import sys

import config


PROJECTS_ROOT = config.DATA_DIR / "projects"


def _shell_command() -> list[str]:
    if os.name == "nt":
        return ["powershell.exe", "-NoLogo"]
    return [os.environ.get("SHELL", "/bin/bash")]


def get_terminal_cwd(project_id: str | None) -> Path:
    if not project_id:
        return PROJECTS_ROOT
    return PROJECTS_ROOT / project_id


async def create_terminal_process(project_id: str | None) -> asyncio.subprocess.Process:
    cwd = get_terminal_cwd(project_id)
    cwd.mkdir(parents=True, exist_ok=True)
    command = _shell_command()
    return await asyncio.create_subprocess_exec(
        *command,
        cwd=str(cwd),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )


async def write_input(process: asyncio.subprocess.Process, data: str) -> None:
    if not process.stdin or process.returncode is not None:
        return
    process.stdin.write(data.encode("utf-8", errors="ignore"))
    await process.stdin.drain()


async def read_stream(process: asyncio.subprocess.Process, callback) -> None:
    if not process.stdout:
        return
    while True:
        chunk = await process.stdout.read(1024)
        if not chunk:
            break
        await callback(chunk.decode("utf-8", errors="ignore"))


async def terminate_process(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    process.terminate()
    try:
        await asyncio.wait_for(process.wait(), timeout=2)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
