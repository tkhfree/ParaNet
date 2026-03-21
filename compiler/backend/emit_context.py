"""Context passed to backend emitters (NodePlanIR + resolved fragments + program)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from compiler.ir import FragmentIR, NodePlanIR, ProgramIR


@dataclass(slots=True)
class EmitContext:
    """Everything needed to synthesize P4 and table entries for one device."""

    plan: NodePlanIR
    fragments_by_id: dict[str, FragmentIR]
    program: ProgramIR | None = None
    """Used to resolve map metadata and cross-fragment context."""

    extra: dict[str, Any] | None = None
    """Optional hints (e.g. compiler version) for manifests."""
