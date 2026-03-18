"""Node-level plan IR produced by placement."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SerializableModel, SourceSpan
from compiler.ir.resources import ResourceUsage


@dataclass(slots=True)
class FragmentPlacement(SerializableModel):
    """Placement metadata for a single fragment on a node."""

    fragment_id: str
    order: int
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class NodePlanIR(SerializableModel):
    """Per-node execution plan after placement."""

    node_id: str
    backend: str = "v1model"

    fragments: list[FragmentPlacement] = field(default_factory=list)
    required_headers: list[str] = field(default_factory=list)
    required_parser_states: list[str] = field(default_factory=list)

    resource_usage: ResourceUsage = field(default_factory=ResourceUsage)
    span: SourceSpan | None = None
