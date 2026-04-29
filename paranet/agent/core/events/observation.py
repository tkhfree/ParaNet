# paranet/agent/core/events/observation.py
"""Observation types for the agent event system."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from paranet.agent.core.events.event import Event


@dataclass
class Observation(Event):
    content: str = ""


@dataclass
class CmdOutputObservation(Observation):
    exit_code: int = 0
    command: str = ""


@dataclass
class FileReadObservation(Observation):
    path: str = ""


@dataclass
class FileWriteObservation(Observation):
    path: str = ""


@dataclass
class FileEditObservation(Observation):
    path: str = ""


@dataclass
class ErrorObservation(Observation):
    pass


@dataclass
class BrowserOutputObservation(Observation):
    url: str = ""


@dataclass
class DSLGenerateObservation(Observation):
    dsl_code: str = ""


@dataclass
class CompileResultObservation(Observation):
    success: bool = False
    errors: list[str] = field(default_factory=list)


@dataclass
class TopologyObservation(Observation):
    topology_id: str = ""


@dataclass
class DBQueryObservation(Observation):
    rows: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class DeployObservation(Observation):
    deploy_id: str = ""
    success: bool = False


@dataclass
class MonitorObservation(Observation):
    metric_type: str = ""
