# tests/test_api_agent_integration.py
"""Integration tests for agent API wired to AgentController."""
import pytest
from unittest.mock import patch, MagicMock
from paranet.agent.core.controller.agent_controller import AgentController
from paranet.agent.agenthub.paranet_agent.agent import ParaNetAgent
from paranet.agent.agenthub.paranet_agent.config import ParaNetAgentConfig
from paranet.agent.core.runtime.local_runtime import LocalRuntime
from paranet.agent.core.events.stream import EventStream


@patch("paranet.agent.agenthub.paranet_agent.agent.LLM")
def test_agent_controller_run_loop(mock_llm_cls):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "I created a simple router for you."
    mock_response.choices[0].message.tool_calls = None
    mock_llm_cls.return_value.completion.return_value = mock_response

    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(agent=agent, runtime=runtime, event_stream=stream, max_iterations=5)

    steps = controller.run_loop("Create a simple router")
    assert len(steps) >= 1
    assert controller.state.agent_state.value == "finished"


@patch("paranet.agent.agenthub.paranet_agent.agent.LLM")
def test_agent_controller_with_tool_execution(mock_llm_cls):
    first_response = MagicMock()
    tool_call = MagicMock()
    tool_call.function.name = "run_command"
    tool_call.function.arguments = '{"command": "echo hello"}'
    tool_call.id = "call_1"
    first_response.choices = [MagicMock()]
    first_response.choices[0].message.content = None
    first_response.choices[0].message.tool_calls = [tool_call]

    second_response = MagicMock()
    second_response.choices = [MagicMock()]
    second_response.choices[0].message.content = "Command ran successfully."
    second_response.choices[0].message.tool_calls = None

    mock_llm_cls.return_value.completion.side_effect = [first_response, second_response]

    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(agent=agent, runtime=runtime, event_stream=stream, max_iterations=5)

    steps = controller.run_loop("Run echo hello")
    assert len(steps) >= 2
    tool_step = [s for s in steps if s.get("action") == "CmdRunAction"]
    assert len(tool_step) >= 1
    assert "hello" in tool_step[0]["observation"]


def test_agent_controller_max_iterations():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(agent=agent, runtime=runtime, event_stream=stream, max_iterations=2)
    assert controller.max_iterations == 2
    assert controller.state.max_iterations == 2


@patch("paranet.agent.agenthub.paranet_agent.agent.LLM")
def test_full_pipeline_command_execution(mock_llm_cls):
    """Test: user asks to run a command -> agent executes -> returns output."""
    first_response = MagicMock()
    tool_call = MagicMock()
    tool_call.function.name = "run_command"
    tool_call.function.arguments = '{"command": "echo integration-test"}'
    tool_call.id = "call_1"
    first_response.choices = [MagicMock()]
    first_response.choices[0].message.content = None
    first_response.choices[0].message.tool_calls = [tool_call]

    second_response = MagicMock()
    second_response.choices = [MagicMock()]
    second_response.choices[0].message.content = "Command executed."
    second_response.choices[0].message.tool_calls = None

    mock_llm_cls.return_value.completion.side_effect = [first_response, second_response]

    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(agent=agent, runtime=runtime, event_stream=stream, max_iterations=5)

    steps = controller.run_loop("Run echo integration-test")
    cmd_steps = [s for s in steps if s.get("action") == "CmdRunAction"]
    assert len(cmd_steps) >= 1
    assert "integration-test" in cmd_steps[0].get("observation", "")
