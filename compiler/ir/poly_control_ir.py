"""Control IR for the Polymorphic DSL — ONOS application model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SerializableModel


@dataclass(slots=True)
class OnosAppMeta(SerializableModel):
    """ONOS application metadata — maps to app.xml."""
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    onos_version: str = "2.7"
    features: list[str] = field(default_factory=list)
    apps: list[str] = field(default_factory=list)  # required ONOS apps
    package_name: str = ""  # Java package, derived from app name


@dataclass(slots=True)
class OnosStateDecl(SerializableModel):
    """Distributed store state declaration."""
    name: str = ""
    java_type: str = ""  # e.g., "String", "Integer", "Map<String,String>"
    store_type: str = "consistent"  # consistent | ephemeral


@dataclass(slots=True)
class OnosEventHandler(SerializableModel):
    """Event-driven handler — maps to ONOS EventListener + method."""
    event_name: str = ""
    event_class: str = ""  # ONOS event class name
    params: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    method_name: str = ""


@dataclass(slots=True)
class OnosPeriodicTask(SerializableModel):
    """Periodic task — maps to ONOS ScheduledExecutorService."""
    name: str = ""
    every_ms: int = 1000
    actions: list[str] = field(default_factory=list)
    method_name: str = ""


@dataclass(slots=True)
class OnosFlowPush(SerializableModel):
    """Flow rule push directive — maps to FlowRuleService API calls."""
    target: str = ""
    rules_ref: str = ""
    via: str = ""


@dataclass(slots=True)
class OnosDiscoveryConfig(SerializableModel):
    """Device discovery configuration."""
    providers: list[dict[str, Any]] = field(default_factory=list)
    on_connected_actions: list[str] = field(default_factory=list)
    on_disconnected_actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ControlIR(SerializableModel):
    """Complete ONOS application IR ready for Java code generation."""
    app: OnosAppMeta = field(default_factory=OnosAppMeta)
    capabilities: list[str] = field(default_factory=list)
    states: list[OnosStateDecl] = field(default_factory=list)
    discovery: OnosDiscoveryConfig = field(default_factory=OnosDiscoveryConfig)
    event_handlers: list[OnosEventHandler] = field(default_factory=list)
    periodic_tasks: list[OnosPeriodicTask] = field(default_factory=list)
    flow_pushes: list[OnosFlowPush] = field(default_factory=list)


__all__ = [
    "OnosAppMeta",
    "OnosStateDecl",
    "OnosEventHandler",
    "OnosPeriodicTask",
    "OnosFlowPush",
    "OnosDiscoveryConfig",
    "ControlIR",
]
