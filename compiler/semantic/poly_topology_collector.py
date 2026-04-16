"""Collect Topology IR from Polymorphic DSL AST, expanding patterns into concrete nodes/links."""

from __future__ import annotations

import math
import uuid
from typing import Any

from compiler.frontend.poly_ast import (
    ConstrainNode,
    LayerNode,
    LinkDefNode,
    MgmtChannelNode,
    PatternNode,
    PolyAstNode,
    PolyValueNode,
    ProfileNode,
    TopoNodeDefNode,
    TopologyBlockNode,
)
from compiler.ir.poly_topology_ir import DeployedLink, DeployedNode, TopologyIR


def _val(node: PolyAstNode | None, default: Any = "") -> Any:
    """Extract raw value from a PolyValueNode."""
    if isinstance(node, PolyValueNode):
        return node.raw
    return default


def _role_to_node_type(role: str) -> str:
    """Map DSL role to frontend node type."""
    mapping = {
        "switch": "switch",
        "router": "router",
        "host": "host",
        "endpoint": "host",
        "controller": "controller",
        "server": "server",
        "p4_switch": "p4_switch",
        "spine": "switch",
        "leaf": "switch",
    }
    return mapping.get(role.lower(), "switch")


def _circular_layout(count: int, center_x: float = 400, center_y: float = 300, radius: float = 200) -> list[dict[str, float]]:
    """Generate circular layout positions for *count* nodes."""
    if count == 0:
        return []
    if count == 1:
        return [{"x": center_x, "y": center_y}]
    return [
        {
            "x": center_x + radius * math.cos(2 * math.pi * i / count),
            "y": center_y + radius * math.sin(2 * math.pi * i / count),
        }
        for i in range(count)
    ]


def _build_profile_map(profiles: list[ProfileNode]) -> dict[str, dict[str, Any]]:
    """Build a profile name -> info dict."""
    result: dict[str, dict[str, Any]] = {}
    for p in profiles:
        info: dict[str, Any] = {
            "target": p.target,
            "pipeline": p.pipeline,
            "compiler": p.compiler,
        }
        if p.mgmt:
            info["mgmt"] = {
                "address": p.mgmt.address or "",
                "protocol": p.mgmt.protocol,
                "port": p.mgmt.port,
                "auth": p.mgmt.auth,
            }
        result[p.name] = info
    return result


def _mgmt_to_config(mgmt: MgmtChannelNode | None) -> dict[str, Any]:
    """Convert MgmtChannelNode to frontend config dict."""
    if mgmt is None:
        return {}
    return {
        "ip": mgmt.address or "",
        "port": mgmt.port,
        "protocol": mgmt.protocol,
    }


def _expand_pattern(
    pattern: PatternNode,
    profile_map: dict[str, dict[str, Any]],
    existing_node_ids: set[str],
) -> tuple[list[DeployedNode], list[DeployedLink]]:
    """Expand a pattern into concrete nodes and links."""
    nodes: list[DeployedNode] = []
    links: list[DeployedLink] = []
    layer_nodes: dict[str, list[str]] = {}  # layer name -> list of node ids

    # Expand layers
    for layer in pattern.layers:
        count = layer.count
        profile_info = profile_map.get(layer.profile_ref, {})
        target = profile_info.get("target", "bmv2")

        positions = _circular_layout(count, radius=150)
        layer_ids: list[str] = []

        for i in range(count):
            node_id = f"{pattern.name}-{layer.name}-{i + 1}"
            # Avoid collision with existing concrete nodes
            if node_id in existing_node_ids:
                node_id = f"{node_id}-p"

            layer_ids.append(node_id)
            existing_node_ids.add(node_id)

            mgmt_config = profile_info.get("mgmt", {})
            nodes.append(DeployedNode(
                id=node_id,
                name=node_id,
                type=_role_to_node_type(layer.name),
                position=positions[i] if i < len(positions) else {"x": 0, "y": 0},
                properties={
                    "dataPlaneTarget": target,
                    "profile": layer.profile_ref,
                },
                config=mgmt_config,
                capabilities={"dataPlaneTarget": target},
            ))

        layer_nodes[layer.name] = layer_ids

    # Expand connections (mesh, etc.)
    for src_layer, dst_layer, conn_type in pattern.connections:
        src_ids = layer_nodes.get(src_layer, [])
        dst_ids = layer_nodes.get(dst_layer, [])
        if conn_type == "mesh":
            for s in src_ids:
                for d in dst_ids:
                    links.append(DeployedLink(
                        id=f"link-{s}-{d}",
                        source=s,
                        target=d,
                        bandwidth=10000,
                        delay=0.1,
                    ))
        else:
            # Default: one-to-one
            for s, d in zip(src_ids, dst_ids):
                links.append(DeployedLink(
                    id=f"link-{s}-{d}",
                    source=s,
                    target=d,
                    bandwidth=10000,
                    delay=0.1,
                ))

    return nodes, links


def collect_topology(topo_block: TopologyBlockNode, protocol_name: str = "") -> TopologyIR:
    """Collect TopologyIR from a TopologyBlockNode AST.

    Steps:
    1. Build profile map
    2. Add concrete nodes
    3. Expand patterns into nodes + links
    4. Add concrete links
    5. Collect constraints
    6. Assign layout positions to concrete nodes
    """
    profile_map = _build_profile_map(topo_block.profiles)
    existing_ids: set[str] = set()
    nodes: list[DeployedNode] = []
    links: list[DeployedLink] = []

    # Add concrete nodes
    concrete_positions = _circular_layout(len(topo_block.nodes), center_x=400, center_y=300, radius=250)
    for i, node_def in enumerate(topo_block.nodes):
        node_id = node_def.name
        existing_ids.add(node_id)

        profile_info = profile_map.get(node_def.profile_ref, {})
        target = profile_info.get("target", "bmv2")

        pos = concrete_positions[i] if i < len(concrete_positions) else {"x": 0, "y": 0}

        nodes.append(DeployedNode(
            id=node_id,
            name=node_id,
            type=_role_to_node_type(node_def.role),
            position=pos,
            properties={
                "dataPlaneTarget": target,
                "profile": node_def.profile_ref,
            },
            config=_mgmt_to_config(node_def.mgmt),
            capabilities={"dataPlaneTarget": target},
        ))

    # Expand patterns
    for pattern in topo_block.patterns:
        p_nodes, p_links = _expand_pattern(pattern, profile_map, existing_ids)
        nodes.extend(p_nodes)
        links.extend(p_links)

    # Add concrete links
    for link_def in topo_block.links:
        link_id = f"link-{link_def.src}-{link_def.dst}"
        bw = _val(link_def.attrs.get("bandwidth"), 0)
        delay = _val(link_def.attrs.get("latency"), 0.0)

        # Parse bandwidth string like "100G" -> 100000 Mbps
        if isinstance(bw, str):
            bw = _parse_bandwidth(bw)
        # Parse latency string like "0.1ms" -> 0.1
        if isinstance(delay, str):
            delay = _parse_latency(delay)

        links.append(DeployedLink(
            id=link_id,
            source=link_def.src,
            target=link_def.dst,
            bandwidth=int(bw) if bw else 10000,
            delay=float(delay) if delay else 0.1,
            properties={
                k: _val(v) for k, v in link_def.attrs.items()
                if k not in ("bandwidth", "latency")
            },
        ))

    # Collect constraints
    constraints = [f"{c.scope}: {c.expression}" for c in topo_block.constraints]

    return TopologyIR(
        id=str(uuid.uuid4()),
        name=f"{protocol_name} Topology" if protocol_name else "Topology",
        description="",
        nodes=nodes,
        links=links,
        profiles=profile_map,
        constraints=constraints,
    )


def _parse_bandwidth(s: str) -> int:
    """Parse bandwidth string to Mbps. E.g., '100G' -> 100000, '10Gbps' -> 10000."""
    s = s.strip().upper()
    multipliers = {"G": 1000, "GBPS": 1000, "T": 1000000, "TBPS": 1000000, "M": 1, "MBPS": 1}
    for suffix, mult in sorted(multipliers.items(), key=lambda x: -len(x[0])):
        if s.endswith(suffix):
            try:
                return int(float(s[:-len(suffix)]) * mult)
            except ValueError:
                return 0
    try:
        return int(float(s))
    except ValueError:
        return 0


def _parse_latency(s: str) -> float:
    """Parse latency string to ms. E.g., '0.1ms' -> 0.1, '< 1ms' -> 1.0."""
    s = s.strip().replace("<", "").replace(">", "").replace("=", "").strip()
    if s.endswith("ms"):
        s = s[:-2]
    elif s.endswith("us"):
        s = s[:-2]
        try:
            return float(s) / 1000
        except ValueError:
            return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


__all__ = ["collect_topology"]
