"""Intent IR for high-level network intent DSL."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from compiler.ir.common import SerializableModel, SourceSpan


class IRType(Enum):
    """Types of IR nodes for intent representation."""

    NETWORK = "network"
    NODE = "node"
    LINK = "link"
    ROUTE = "route"
    FORWARD = "forward"
    POLICY = "policy"
    QOS = "qos"
    IP_CONFIG = "ip_config"
    NDN_CONFIG = "ndn_config"
    GEO_CONFIG = "geo_config"
    P4_CONFIG = "p4_config"


@dataclass(slots=True)
class IRNode(SerializableModel):
    """A node in the Intent IR graph."""

    ir_type: IRType
    name: str
    attributes: dict[str, Any] = field(default_factory=dict)
    children: list[IRNode] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def add_child(self, child: IRNode) -> None:
        self.children.append(child)

    def get_attr(self, key: str, default: Any = None) -> Any:
        return self.attributes.get(key, default)

    def set_attr(self, key: str, value: Any) -> None:
        self.attributes[key] = value


@dataclass(slots=True)
class IntentIR(SerializableModel):
    """Protocol-agnostic representation of network intent."""

    root: IRNode | None = None
    version: str = "1.0"
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_ast(cls, ast: Any) -> "IntentIR":
        """
        Build an IntentIR from parsed Intent AST.

        Note: transformation is still a placeholder; we only create a root node.
        """
        ir = cls()
        ir.root = IRNode(
            ir_type=IRType.NETWORK,
            name="root",
            metadata={"source": "ast"},
        )
        return ir

    def validate(self) -> list[str]:
        errors: list[str] = []
        if self.root is None:
            errors.append("IR has no root node")
        return errors

    def optimize(self) -> "IntentIR":
        """Apply optimization passes (placeholder)."""
        # TODO: implement optimization passes
        return self

    def to_dict(self) -> dict[str, Any]:
        def node_to_dict(node: IRNode) -> dict[str, Any]:
            return {
                "type": node.ir_type.value,
                "name": node.name,
                "attributes": node.attributes,
                "children": [node_to_dict(c) for c in node.children],
                "metadata": node.metadata,
            }

        return {
            "version": self.version,
            "metadata": self.metadata,
            "root": node_to_dict(self.root) if self.root else None,
        }
