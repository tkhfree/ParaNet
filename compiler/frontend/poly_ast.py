"""AST node definitions for the Polymorphic Network Protocol DSL."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from typing import Any

from compiler.ir.common import SourceSpan


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


# ---------------------------------------------------------------------------
# Value nodes (shared)
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class PolyAstNode:
    """Base class for all Polymorphic DSL AST nodes."""

    span: SourceSpan | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = _serialize(self)
        payload["node_type"] = self.__class__.__name__
        return payload


@dataclass(slots=True)
class PolyValueNode(PolyAstNode):
    """Literal value (string, number, boolean)."""

    raw: str | int | float | bool = ""
    kind: str = "string"  # "string" | "number" | "boolean"


@dataclass(slots=True)
class PolyListValueNode(PolyAstNode):
    """List of PolyAstNode items."""

    items: list[PolyAstNode] = field(default_factory=list)


@dataclass(slots=True)
class PolyObjectPairNode(PolyAstNode):
    """Key-value pair within an object literal."""

    key: str = ""
    value: PolyAstNode | None = None


@dataclass(slots=True)
class PolyObjectValueNode(PolyAstNode):
    """Object literal composed of key-value pairs."""

    pairs: list[PolyObjectPairNode] = field(default_factory=list)


@dataclass(slots=True)
class PolyAttrNode(PolyAstNode):
    """Key + value pair used across all blocks."""

    key: str = ""
    value: PolyAstNode | None = None


# ---------------------------------------------------------------------------
# Topology plane
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class MgmtChannelNode(PolyAstNode):
    """Management channel configuration for a profile or node."""

    address: str = ""
    protocol: str = ""
    port: int = 0
    auth: PolyAstNode | None = None


@dataclass(slots=True)
class ProfileNode(PolyAstNode):
    """Device profile definition in the topology plane."""

    name: str = ""
    target: str = ""
    pipeline: str = ""
    compiler: str = ""
    mgmt: MgmtChannelNode | None = None


@dataclass(slots=True)
class LayerNode(PolyAstNode):
    """Layer definition within a pattern."""

    name: str = ""
    count: int = 0
    profile_ref: str = ""


@dataclass(slots=True)
class PatternNode(PolyAstNode):
    """Topology pattern definition (e.g. spine-leaf, mesh)."""

    name: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    layers: list[str] = field(default_factory=list)
    connections: list[tuple[str, str]] = field(default_factory=list)


@dataclass(slots=True)
class TopoNodeDefNode(PolyAstNode):
    """Individual node definition in the topology."""

    name: str = ""
    role: str = ""
    profile_ref: str = ""
    mgmt: MgmtChannelNode | None = None


@dataclass(slots=True)
class LinkDefNode(PolyAstNode):
    """Link definition between two topology nodes."""

    src: str = ""
    dst: str = ""
    directed: bool = False
    attrs: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ConstrainNode(PolyAstNode):
    """Constraint on topology scope."""

    scope: str = ""
    expression: str = ""


@dataclass(slots=True)
class TopologyBlockNode(PolyAstNode):
    """Complete topology block containing profiles, patterns, nodes, links, and constraints."""

    profiles: list[ProfileNode] = field(default_factory=list)
    patterns: list[PatternNode] = field(default_factory=list)
    nodes: list[TopoNodeDefNode] = field(default_factory=list)
    links: list[LinkDefNode] = field(default_factory=list)
    constraints: list[ConstrainNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Control plane
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class AppMetaNode(PolyAstNode):
    """Application metadata in the control plane."""

    name: str = ""
    version: str = ""
    description: str = ""
    onos_version: str = ""
    features: list[str] = field(default_factory=list)


@dataclass(slots=True)
class StateDeclNode(PolyAstNode):
    """State variable declaration in the control plane."""

    name: str = ""
    type_expr: str = ""


@dataclass(slots=True)
class ProviderEntryNode(PolyAstNode):
    """Discovery provider entry."""

    name: str = ""
    config: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DiscoveryNode(PolyAstNode):
    """Discovery configuration with providers and lifecycle hooks."""

    providers: list[ProviderEntryNode] = field(default_factory=list)
    on_connected: list[str] = field(default_factory=list)
    on_disconnected: list[str] = field(default_factory=list)


@dataclass(slots=True)
class OnEventNode(PolyAstNode):
    """Event handler definition."""

    event_name: str = ""
    params: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class PeriodicNode(PolyAstNode):
    """Periodic task definition."""

    name: str = ""
    every: str = ""
    actions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class FlowPushNode(PolyAstNode):
    """Flow rule push directive."""

    target: str = ""
    rules_ref: str = ""
    via: str | None = None


@dataclass(slots=True)
class ControlBlockNode(PolyAstNode):
    """Complete control plane block."""

    app: AppMetaNode | None = None
    capabilities: list[str] = field(default_factory=list)
    states: list[StateDeclNode] = field(default_factory=list)
    discovery: DiscoveryNode | None = None
    event_handlers: list[OnEventNode] = field(default_factory=list)
    periodic_tasks: list[PeriodicNode] = field(default_factory=list)
    flow_pushes: list[FlowPushNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Data plane
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class HeaderFieldNode(PolyAstNode):
    """Header or metadata field in a packet definition."""

    name: str = ""
    type_ref: str = ""


@dataclass(slots=True)
class PacketDefNode(PolyAstNode):
    """Packet structure definition."""

    name: str = ""
    header_fields: list[HeaderFieldNode] = field(default_factory=list)
    metadata_fields: list[HeaderFieldNode] = field(default_factory=list)


@dataclass(slots=True)
class ParseMatchCaseNode(PolyAstNode):
    """Single match case within a parser definition."""

    match_value: str = ""
    action: str = ""


@dataclass(slots=True)
class ParseDefNode(PolyAstNode):
    """Parser definition with extract and match logic."""

    name: str = ""
    packet_ref: str = ""
    extracts: list[str] = field(default_factory=list)
    match_cases: list[ParseMatchCaseNode] = field(default_factory=list)
    default_action: str = ""


@dataclass(slots=True)
class ModuleDefNode(PolyAstNode):
    """Processing module definition."""

    name: str = ""
    packet_ref: str = ""
    when_clause: str = ""
    action_clause: str = ""
    constraints: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ServiceDefNode(PolyAstNode):
    """Service definition in the data plane."""

    name: str = ""
    applies: list[str] = field(default_factory=list)
    target_role: str = ""
    pipeline: str = ""
    constraints: list[str] = field(default_factory=list)


@dataclass(slots=True)
class DataBlockNode(PolyAstNode):
    """Complete data plane block."""

    packets: list[PacketDefNode] = field(default_factory=list)
    parsers: list[ParseDefNode] = field(default_factory=list)
    includes: list[str] = field(default_factory=list)
    modules: list[ModuleDefNode] = field(default_factory=list)
    services: list[ServiceDefNode] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class PolymorphicDefNode(PolyAstNode):
    """Top-level protocol definition."""

    name: str = ""
    extends: str | None = None
    mixins: list[str] = field(default_factory=list)
    topology: TopologyBlockNode | None = None
    control: ControlBlockNode | None = None
    data: DataBlockNode | None = None


@dataclass(slots=True)
class PolyProgramNode(PolyAstNode):
    """Root node for a complete Polymorphic DSL program."""

    protocols: list[PolymorphicDefNode] = field(default_factory=list)
