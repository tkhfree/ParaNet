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
