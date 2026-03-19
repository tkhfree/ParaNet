"""Intent DSL AST node definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SourceSpan


@dataclass(slots=True)
class IntentAstNode:
    span: SourceSpan | None = None


@dataclass(slots=True)
class ValueNode(IntentAstNode):
    """Literal value (string, number, boolean)."""
    raw: str | int | float | bool = ""
    kind: str = "string"  # "string" | "number" | "boolean"


@dataclass(slots=True)
class ListValueNode(IntentAstNode):
    items: list[IntentAstNode] = field(default_factory=list)


@dataclass(slots=True)
class ObjectPairNode(IntentAstNode):
    key: str = ""
    value: IntentAstNode | None = None


@dataclass(slots=True)
class ObjectValueNode(IntentAstNode):
    pairs: list[ObjectPairNode] = field(default_factory=list)


@dataclass(slots=True)
class EndpointPairNode(IntentAstNode):
    a: str = ""
    b: str = ""


@dataclass(slots=True)
class EndpointSpecNode(IntentAstNode):
    kind: str = "identifier"  # "identifier" | "prefix" | "region"
    value: IntentAstNode | str | None = None


@dataclass(slots=True)
class ViaSpecNode(IntentAstNode):
    nodes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class AttrNode(IntentAstNode):
    key: str = ""
    value: IntentAstNode | None = None


@dataclass(slots=True)
class ImportStmtNode(IntentAstNode):
    path: str = ""


@dataclass(slots=True)
class NetworkDefNode(IntentAstNode):
    name: str = ""
    attrs: list[AttrNode] = field(default_factory=list)
    nested: list[IntentAstNode] = field(default_factory=list)


@dataclass(slots=True)
class NodeDefNode(IntentAstNode):
    name: str = ""
    node_type: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class LinkDefNode(IntentAstNode):
    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class RouteDefNode(IntentAstNode):
    name: str | None = None
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class PolicyDefNode(IntentAstNode):
    name: str = ""
    attrs: list[AttrNode] = field(default_factory=list)


@dataclass(slots=True)
class IntentProgramNode(IntentAstNode):
    declarations: list[IntentAstNode] = field(default_factory=list)
