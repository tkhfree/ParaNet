"""Placement planner: FragmentIR -> NodePlanIR (MVP v0: round-robin on topology nodes)."""

from __future__ import annotations

from typing import Any

from compiler.ir import FragmentIR, NodePlanIR, ProgramIR
from compiler.ir.node_plan_ir import FragmentPlacement
from compiler.placement.node_target import normalize_data_plane_target, resolve_node_data_plane_target


def greedy_place(
    fragments: list[FragmentIR],
    program: ProgramIR,
    *,
    default_backend: str = "bmv2",
    override_backend: str | None = None,
) -> list[NodePlanIR]:
    """
    Assign each fragment to a topology node in round-robin order.

    Each node's ``NodePlanIR.backend`` comes from topology node metadata
    (``capabilities.dataPlaneTarget`` / ``dataPlaneTarget``), defaulting to
    ``default_backend``. If ``override_backend`` is set (e.g. CLI), all nodes use it.

    If ``program.metadata['topology']`` has no nodes, all fragments are placed on ``default``.
    """
    topo = program.metadata.get("topology")
    node_ids: list[str] = []
    node_by_id: dict[str, dict[str, Any]] = {}
    if isinstance(topo, dict):
        nodes = topo.get("nodes")
        if isinstance(nodes, list):
            for n in nodes:
                if isinstance(n, dict):
                    nid = n.get("id")
                    if isinstance(nid, str) and nid:
                        node_ids.append(nid)
                        node_by_id[nid] = n

    default_backend = normalize_data_plane_target(default_backend, "bmv2")
    forced: str | None = None
    if override_backend is not None and str(override_backend).strip():
        forced = normalize_data_plane_target(str(override_backend), default_backend)

    if not node_ids:
        be = forced if forced is not None else default_backend
        return [
            NodePlanIR(
                node_id="default",
                backend=be,
                fragments=[
                    FragmentPlacement(fragment_id=fr.id, order=i) for i, fr in enumerate(fragments)
                ],
            )
        ]

    # Round-robin: fragment i -> node_ids[i % len(node_ids)]
    per_node: dict[str, list[tuple[int, FragmentIR]]] = {nid: [] for nid in node_ids}
    for i, fr in enumerate(fragments):
        nid = node_ids[i % len(node_ids)]
        per_node[nid].append((i, fr))

    plans: list[NodePlanIR] = []
    for nid in node_ids:
        items = per_node[nid]
        placements = [
            FragmentPlacement(fragment_id=fr.id, order=ord_idx) for ord_idx, (_, fr) in enumerate(items)
        ]
        if forced is not None:
            be = forced
        else:
            be = resolve_node_data_plane_target(node_by_id.get(nid, {}), default_backend)
        plans.append(
            NodePlanIR(
                node_id=nid,
                backend=be,
                fragments=placements,
                required_headers=[],
            )
        )
    return plans


__all__ = ["greedy_place"]
