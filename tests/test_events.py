"""Tests for the event system base classes."""
import pytest
from datetime import datetime
from paranet.agent.core.events.event import Event, EventSource


def test_event_defaults():
    e = Event()
    assert e.id == Event.INVALID_ID
    assert e.timestamp is not None
    assert e.source == EventSource.USER


def test_event_source_enum():
    assert EventSource.AGENT.value == "agent"
    assert EventSource.USER.value == "user"
    assert EventSource.ENVIRONMENT.value == "environment"


def test_event_set_id():
    e = Event()
    e.id = 42
    assert e.id == 42


def test_event_cause_chain():
    e1 = Event()
    e1.id = 1
    e2 = Event()
    e2.cause = e1.id
    assert e2.cause == 1


# --- Task 2: Actions and Observations ---

from paranet.agent.core.events.action import (
    Action, ActionConfirmationStatus, CmdRunAction,
    FileReadAction, FileWriteAction, AgentFinishAction,
    DSLGenerateAction, CompilePreviewAction, TopologyAction,
    DBQueryAction, UserMessageAction,
)
from paranet.agent.core.events.observation import (
    Observation, CmdOutputObservation, FileReadObservation,
    ErrorObservation, DSLGenerateObservation, CompileResultObservation,
    TopologyObservation, DBQueryObservation,
)


def test_action_base():
    a = Action()
    assert a.runnable is False
    assert a.confirmation_status == ActionConfirmationStatus.CONFIRMED


def test_cmd_run_action():
    a = CmdRunAction(command="ls -la")
    assert a.command == "ls -la"
    assert a.runnable is True


def test_file_read_action():
    a = FileReadAction(path="/tmp/test.txt")
    assert a.path == "/tmp/test.txt"
    assert a.runnable is True


def test_file_write_action():
    a = FileWriteAction(path="/tmp/test.txt", content="hello")
    assert a.content == "hello"
    assert a.runnable is True


def test_agent_finish_action():
    a = AgentFinishAction(outputs={"result": "done"})
    assert a.runnable is False


def test_dsl_generate_action():
    a = DSLGenerateAction(description="IPv4 router with ACL")
    assert a.description == "IPv4 router with ACL"
    assert a.runnable is True


def test_compile_preview_action():
    a = CompilePreviewAction(dsl_code="node h1 { role: host; }")
    assert a.dsl_code == "node h1 { role: host; }"
    assert a.runnable is True


def test_topology_action():
    a = TopologyAction(operation="add_node", params={"name": "s1"})
    assert a.operation == "add_node"
    assert a.runnable is True


def test_db_query_action():
    a = DBQueryAction(query="SELECT * FROM topologies")
    assert a.query == "SELECT * FROM topologies"
    assert a.runnable is True


def test_user_message_action():
    a = UserMessageAction(content="Create a simple router")
    assert a.content == "Create a simple router"
    assert a.runnable is False


def test_observation_base():
    o = Observation(content="hello")
    assert o.content == "hello"


def test_cmd_output_observation():
    o = CmdOutputObservation(content="file1\nfile2", exit_code=0)
    assert o.exit_code == 0


def test_error_observation():
    o = ErrorObservation(content="file not found")
    assert "file not found" in o.content


def test_dsl_generate_observation():
    o = DSLGenerateObservation(content="node h1 { role: host; }")
    assert "node h1" in o.content


def test_compile_result_observation():
    o = CompileResultObservation(content="compiled OK", success=True)
    assert o.success is True


def test_topology_observation():
    o = TopologyObservation(content='{"nodes": []}')
    assert "nodes" in o.content


def test_db_query_observation():
    o = DBQueryObservation(content='[{"id": 1}]')
    assert "id" in o.content


# --- Task 3: EventStream ---

from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.events.action import CmdRunAction
from paranet.agent.core.events.observation import CmdOutputObservation


def test_event_stream_add_and_subscribe():
    stream = EventStream()
    received = []
    def on_event(event):
        received.append(event)
    stream.subscribe(EventStreamSubscriber.RUNTIME, on_event)
    action = CmdRunAction(command="echo hello")
    stream.add_event(action, EventSource.AGENT)
    assert len(received) == 1
    assert received[0].command == "echo hello"


def test_event_stream_unsubscribe():
    stream = EventStream()
    received = []
    def on_event(event):
        received.append(event)
    stream.subscribe(EventStreamSubscriber.RUNTIME, on_event)
    stream.unsubscribe(EventStreamSubscriber.RUNTIME)
    action = CmdRunAction(command="echo hello")
    stream.add_event(action, EventSource.AGENT)
    assert len(received) == 0


def test_event_stream_auto_assigns_id():
    stream = EventStream()
    action = CmdRunAction(command="ls")
    stream.add_event(action, EventSource.AGENT)
    assert action.id >= 0


def test_event_stream_sets_source():
    stream = EventStream()
    action = CmdRunAction(command="ls")
    stream.add_event(action, EventSource.AGENT)
    assert action.source == EventSource.AGENT


def test_event_stream_multiple_subscribers():
    stream = EventStream()
    received_a = []
    received_b = []
    stream.subscribe(EventStreamSubscriber.RUNTIME, lambda e: received_a.append(e))
    stream.subscribe(EventStreamSubscriber.AGENT_CONTROLLER, lambda e: received_b.append(e))
    action = CmdRunAction(command="ls")
    stream.add_event(action, EventSource.AGENT)
    assert len(received_a) == 1
    assert len(received_b) == 1
