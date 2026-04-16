"""Topology IR for the Polymorphic DSL — expanded deployment topology."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SerializableModel


@dataclass(slots=True)
class DeployedNode(SerializableModel):
    """A concrete node in the expanded deployment topology."""

    id: str = ""
    name: str = ""
    type: str = "switch"  # switch | router | host | controller | server | p4_switch
    position: dict[str, float] = field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    properties: dict[str, Any] = field(default_factory=dict)
    config: dict[str, Any] = field(default_factory=dict)
    capabilities: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DeployedLink(SerializableModel):
    """A concrete link between two deployed nodes."""

    id: str = ""
    source: str = ""  # node id
    target: str = ""  # node id
    source_port: str = ""
    target_port: str = ""
    bandwidth: int = 0  # Mbps
    delay: float = 0.0  # ms
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class TopologyIR(SerializableModel):
    """Expanded topology ready for deployment and rendering."""

    id: str = ""
    name: str = ""
    description: str = ""
    nodes: list[DeployedNode] = field(default_factory=list)
    links: list[DeployedLink] = field(default_factory=list)
    profiles: dict[str, dict[str, Any]] = field(default_factory=dict)
    constraints: list[str] = field(default_factory=list)

    def to_render_json(self) -> dict[str, Any]:
        """Convert to JSON format expected by frontend D3.js topology engine."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "type": n.type,
                    "position": n.position,
                    "properties": n.properties,
                    "config": n.config,
                    "capabilities": n.capabilities,
                }
                for n in self.nodes
            ],
            "links": [
                {
                    "id": lk.id,
                    "source": lk.source,
                    "target": lk.target,
                    "sourcePort": lk.source_port,
                    "targetPort": lk.target_port,
                    "bandwidth": lk.bandwidth,
                    "delay": lk.delay,
                    "properties": lk.properties,
                }
                for lk in self.links
            ],
        }


__all__ = ["DeployedNode", "DeployedLink", "TopologyIR"]
