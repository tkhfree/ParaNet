"""Tests for agent controller state and agent base."""
import pytest
from paranet.agent.core.controller.state import AgentState, State
from paranet.agent.core.controller.agent import Agent, AgentConfig


def test_agent_state_enum():
    assert AgentState.RUNNING.value == "running"
    assert AgentState.FINISHED.value == "finished"
    assert AgentState.ERROR.value == "error"
    assert AgentState.AWAITING_USER_INPUT.value == "awaiting_user_input"
    assert AgentState.PAUSED.value == "paused"


def test_state_defaults():
    s = State()
    assert s.iteration == 0
    assert s.max_iterations == 30
    assert s.agent_state == AgentState.RUNNING


def test_state_iteration_limit():
    s = State(max_iterations=5)
    s.iteration = 5
    assert s.iteration >= s.max_iterations


def test_agent_config_defaults():
    c = AgentConfig()
    assert c.model == "gpt-4o-mini"
    assert c.max_iterations == 30
    assert c.enable_cmd is True


def test_agent_is_abstract():
    with pytest.raises(TypeError):
        Agent(AgentConfig())
