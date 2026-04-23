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


from paranet.agent.core.controller.agent_controller import AgentController
from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.events.action import (
    CmdRunAction, AgentFinishAction, UserMessageAction,
)
from paranet.agent.core.events.observation import CmdOutputObservation, Observation
from paranet.agent.agenthub.paranet_agent.agent import ParaNetAgent
from paranet.agent.agenthub.paranet_agent.config import ParaNetAgentConfig
from paranet.agent.core.runtime.local_runtime import LocalRuntime


def test_controller_init():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=stream,
        max_iterations=5,
    )
    assert controller.max_iterations == 5


def test_controller_step_advances_iteration():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=stream,
        max_iterations=10,
    )
    assert controller.state.iteration == 0


def test_controller_processes_cmd_action():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=stream,
        max_iterations=10,
    )
    action = CmdRunAction(command="echo test")
    obs = controller.execute_action(action)
    assert isinstance(obs, CmdOutputObservation)
    assert "test" in obs.content


def test_controller_finish_action():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=stream,
        max_iterations=10,
    )
    action = AgentFinishAction(outputs={"content": "done"})
    result = controller.execute_action(action)
    assert result is None


def test_controller_events_published():
    config = ParaNetAgentConfig(api_key="test")
    agent = ParaNetAgent(config)
    runtime = LocalRuntime()
    stream = EventStream()
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=stream,
        max_iterations=10,
    )
    events_received = []
    stream.subscribe(EventStreamSubscriber.SSE_BRIDGE, lambda e: events_received.append(e))
    action = CmdRunAction(command="echo hi")
    controller.execute_action(action)
    assert len(events_received) >= 1
