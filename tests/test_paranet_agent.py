"""Tests for ParaNetAgent."""
import pytest
from unittest.mock import MagicMock, patch

from paranet.agent.agenthub.paranet_agent.agent import ParaNetAgent
from paranet.agent.agenthub.paranet_agent.config import ParaNetAgentConfig
from paranet.agent.core.controller.state import State
from paranet.agent.core.events.action import (
    Action,
    CmdRunAction,
    AgentFinishAction,
    DSLGenerateAction,
)


def test_config_defaults():
    c = ParaNetAgentConfig()
    assert c.model == "gpt-4o-mini"
    assert c.enable_cmd is True
    assert c.enable_dsl_tools is True
    assert c.enable_topology_tools is True
    assert c.enable_db_tools is True


def test_agent_init():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    assert agent.config.model == "gpt-4o-mini"


def test_agent_get_tools():
    config = ParaNetAgentConfig()
    agent = ParaNetAgent(config)
    tools = agent.get_tools()
    tool_names = [t["function"]["name"] for t in tools]
    assert "run_command" in tool_names
    assert "generate_dsl" in tool_names
    assert "compile_preview" in tool_names
    assert "read_file" in tool_names
    assert "topology_op" in tool_names
    assert "query_db" in tool_names


def test_agent_get_tools_disabled():
    config = ParaNetAgentConfig(
        enable_cmd=False,
        enable_browse=False,
        enable_db_tools=False,
    )
    agent = ParaNetAgent(config)
    tools = agent.get_tools()
    tool_names = [t["function"]["name"] for t in tools]
    assert "run_command" not in tool_names
    assert "browse_url" not in tool_names
    assert "query_db" not in tool_names


@patch("paranet.agent.agenthub.paranet_agent.agent.LLM")
def test_agent_step_returns_action(mock_llm_cls):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Done!"
    mock_response.choices[0].message.tool_calls = None
    mock_llm_cls.return_value.completion.return_value = mock_response

    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    state = State(history=[{"role": "user", "content": "Hello"}])
    action = agent.step(state)
    assert isinstance(action, Action)


@patch("paranet.agent.agenthub.paranet_agent.agent.LLM")
def test_agent_step_with_tool_call(mock_llm_cls):
    tool_call = MagicMock()
    tool_call.function.name = "run_command"
    tool_call.function.arguments = '{"command": "echo hi"}'
    tool_call.id = "call_123"

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = None
    mock_response.choices[0].message.tool_calls = [tool_call]
    mock_llm_cls.return_value.completion.return_value = mock_response

    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    state = State(history=[{"role": "user", "content": "Run echo"}])
    action = agent.step(state)
    assert isinstance(action, CmdRunAction)
    assert action.command == "echo hi"


def test_agent_reset():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    agent.reset()
    assert agent.config.model == "gpt-4o-mini"
