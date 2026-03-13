from __future__ import annotations

import asyncio
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Awaitable, Callable

import config

try:
    from winpty import PtyProcess
except ImportError:  # pragma: no cover - optional dependency on Windows
    PtyProcess = None  # type: ignore[assignment]


PROJECTS_ROOT = config.DATA_DIR / "projects"
OutputCallback = Callable[[str], Awaitable[None]]


@dataclass
class PipeTerminalProcess:
    process: asyncio.subprocess.Process


@dataclass
class PtyTerminalProcess:
    process: PtyProcess


TerminalProcess = PipeTerminalProcess | PtyTerminalProcess


def _shell_command() -> list[str]:
    if os.name == "nt":
        return ["powershell.exe", "-NoLogo"]
    return [os.environ.get("SHELL", "/bin/bash")]


def _build_windows_pty_command(cwd: Path) -> str:
    escaped_cwd = str(cwd).replace("'", "''")
    return (
        "powershell.exe -NoLogo -NoProfile -NoExit "
        f"-Command \"Set-Location -LiteralPath '{escaped_cwd}'; "
        "Remove-Module PSReadLine -ErrorAction SilentlyContinue\""
    )


def get_terminal_cwd(project_id: str | None) -> Path:
    if not project_id:
        return PROJECTS_ROOT
    return PROJECTS_ROOT / project_id


async def create_terminal_process(project_id: str | None) -> TerminalProcess:
    cwd = get_terminal_cwd(project_id)
    cwd.mkdir(parents=True, exist_ok=True)

    if os.name == "nt" and PtyProcess is not None:
        process = await asyncio.to_thread(PtyProcess.spawn, _build_windows_pty_command(cwd))
        return PtyTerminalProcess(process=process)

    command = _shell_command()
    process = await asyncio.create_subprocess_exec(
        *command,
        cwd=str(cwd),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    return PipeTerminalProcess(process=process)


async def write_input(process: TerminalProcess, data: str) -> None:
    if isinstance(process, PtyTerminalProcess):
        if process.process.isalive():
            await asyncio.to_thread(process.process.write, data)
        return

    if not process.process.stdin or process.process.returncode is not None:
        return
    process.process.stdin.write(data.encode("utf-8", errors="ignore"))
    await process.process.stdin.drain()


async def read_stream(process: TerminalProcess, callback: OutputCallback) -> None:
    if isinstance(process, PtyTerminalProcess):
        while True:
            try:
                chunk = await asyncio.to_thread(process.process.read, 1024)
            except EOFError:
                break

            if not chunk:
                if not process.process.isalive():
                    break
                await asyncio.sleep(0.05)
                continue

            text = chunk.decode("utf-8", errors="ignore") if isinstance(chunk, bytes) else str(chunk)
            await callback(text)
        return

    if not process.process.stdout:
        return
    while True:
        chunk = await process.process.stdout.read(1024)
        if not chunk:
            break
        await callback(chunk.decode("utf-8", errors="ignore"))


async def terminate_process(process: TerminalProcess) -> None:
    if isinstance(process, PtyTerminalProcess):
        if process.process.isalive():
            await asyncio.to_thread(process.process.close)
        return

    if process.process.returncode is not None:
        return
    process.process.terminate()
    try:
        await asyncio.wait_for(process.process.wait(), timeout=2)
    except asyncio.TimeoutError:
        process.process.kill()
        await process.process.wait()
