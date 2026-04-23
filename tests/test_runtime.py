"""Tests for the runtime sandbox."""
import pytest

from paranet.agent.core.runtime.base import Runtime
from paranet.agent.core.runtime.local_runtime import LocalRuntime
from paranet.agent.core.runtime.factory import RuntimeFactory
from paranet.agent.core.events.action import CmdRunAction, FileReadAction, FileWriteAction
from paranet.agent.core.events.observation import (
    CmdOutputObservation,
    FileReadObservation,
    FileWriteObservation,
)


def test_runtime_is_abstract():
    with pytest.raises(TypeError):
        Runtime()


def test_local_run_command():
    runtime = LocalRuntime()
    action = CmdRunAction(command="echo hello")
    obs = runtime.run(action)
    assert isinstance(obs, CmdOutputObservation)
    assert obs.exit_code == 0
    assert "hello" in obs.content


def test_local_run_command_timeout():
    runtime = LocalRuntime(default_timeout=1)
    action = CmdRunAction(command="sleep 10", timeout=1)
    obs = runtime.run(action)
    assert isinstance(obs, CmdOutputObservation)
    assert obs.exit_code != 0


def test_local_file_write_and_read(tmp_path):
    runtime = LocalRuntime(workspace=str(tmp_path))
    file_path = str(tmp_path / "test.txt")

    write_action = FileWriteAction(path=file_path, content="hello world")
    write_obs = runtime.write(write_action)
    assert isinstance(write_obs, FileWriteObservation)

    read_action = FileReadAction(path=file_path)
    read_obs = runtime.read(read_action)
    assert isinstance(read_obs, FileReadObservation)
    assert "hello world" in read_obs.content


def test_local_run_failing_command():
    runtime = LocalRuntime()
    action = CmdRunAction(command="false")
    obs = runtime.run(action)
    assert obs.exit_code != 0


def test_factory_creates_local():
    runtime = RuntimeFactory.create(force="local")
    assert isinstance(runtime, LocalRuntime)
