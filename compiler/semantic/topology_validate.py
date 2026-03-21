"""Validate intent-derived references against topology_snapshot (ProgramIR.metadata['topology'])."""

from __future__ import annotations

from typing import Any

from compiler.ir import InstructionIR, ProgramIR
from compiler.ir.common import Diagnostic, DiagnosticSeverity


def topology_node_ids(topology: dict[str, Any]) -> set[str]:
    """Collect node ids from a topology snapshot dict."""
    nodes = topology.get("nodes")
    if not isinstance(nodes, list):
        return set()
    out: set[str] = set()
    for n in nodes:
        if isinstance(n, dict):
            nid = n.get("id")
            if isinstance(nid, str) and nid:
                out.add(nid)
    return out


def _refs_from_instruction(instr: InstructionIR) -> list[tuple[str, str]]:
    """Return (role, node_id) pairs for topology validation."""
    out: list[tuple[str, str]] = []
    data = instr.data or {}

    if instr.kind == "intent_route_lookup":
        dest = data.get("destination")
        if isinstance(dest, str) and dest:
            out.append(("destination", dest))
        via = data.get("via")
        if isinstance(via, list):
            for v in via:
                if isinstance(v, str) and v:
                    out.append(("via", v))

    elif instr.kind == "intent_schedule":
        attrs = data.get("attrs") or {}
        if isinstance(attrs, dict):
            node_val = attrs.get("node")
            if isinstance(node_val, str) and node_val:
                out.append(("schedule.node", node_val))

    return out


def validate_topology_references(program: ProgramIR) -> list[Diagnostic]:
    """
    When program.metadata['topology'] is set, ensure route/schedule references
    use node ids that exist in topology['nodes'].
    """
    topo = program.metadata.get("topology")
    if not isinstance(topo, dict):
        return []

    valid = topology_node_ids(topo)
    diagnostics: list[Diagnostic] = []

    for mod in program.modules.values():
        for instr in mod.body:
            for role, node_id in _refs_from_instruction(instr):
                if node_id in valid:
                    continue
                diagnostics.append(
                    Diagnostic(
                        code="TOP001",
                        message=(
                            f"Unknown topology node '{node_id}' referenced in {role} "
                            f"(module '{mod.name}')"
                        ),
                        severity=DiagnosticSeverity.ERROR,
                        span=instr.span,
                    )
                )

    return diagnostics


__all__ = ["topology_node_ids", "validate_topology_references"]
