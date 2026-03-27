"""Topology-related agent tools."""

from __future__ import annotations

from typing import Any

from app.services.agent_tools import register_tool
from app.services import topology_service

# ---------------------------------------------------------------------------
# Tool: list_topologies
# ---------------------------------------------------------------------------

_LIST_TOPOLOGIES_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_topologies",
        "description": "列出项目中的拓扑列表。返回拓扑概览（名称、节点数、链路数等）。",
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {
                    "type": "string",
                    "description": "项目 ID，不传则返回所有拓扑",
                },
            },
            "required": [],
        },
    },
}


def _list_topologies(projectId: str | None = None, **_kwargs: Any) -> dict[str, Any]:
    result = topology_service.list_topologies(
        page_no=1,
        page_size=50,
        project_id=projectId,
    )
    records = result.get("records", []) if isinstance(result, dict) else []
    summaries = []
    for r in records:
        summaries.append({
            "id": r.get("id"),
            "name": r.get("name"),
            "nodeCount": len(r.get("nodes", [])),
            "linkCount": len(r.get("links", [])),
        })
    return {"topologies": summaries, "total": len(summaries)}


# ---------------------------------------------------------------------------
# Tool: get_topology
# ---------------------------------------------------------------------------

_GET_TOPOLOGY_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_topology",
        "description": "获取指定拓扑的完整详情，包括所有节点和链路。",
        "parameters": {
            "type": "object",
            "properties": {
                "topology_id": {
                    "type": "string",
                    "description": "拓扑 ID",
                },
            },
            "required": ["topology_id"],
        },
    },
}


def _get_topology(topology_id: str, **_kwargs: Any) -> dict[str, Any]:
    topo = topology_service.get_topology(topology_id)
    if not topo:
        return {"error": f"拓扑 {topology_id} 不存在"}
    return topo


# ---------------------------------------------------------------------------
# Tool: add_topology_node
# ---------------------------------------------------------------------------

_ADD_NODE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "add_topology_node",
        "description": "向指定拓扑中添加一个设备节点。返回更新后的拓扑。",
        "parameters": {
            "type": "object",
            "properties": {
                "topology_id": {"type": "string", "description": "拓扑 ID"},
                "name": {"type": "string", "description": "节点名称，例如 switch-1"},
                "type": {
                    "type": "string",
                    "description": "节点类型，例如 switch, router, host, controller",
                },
                "x": {"type": "number", "description": "节点 X 坐标，默认随机"},
                "y": {"type": "number", "description": "节点 Y 坐标，默认随机"},
            },
            "required": ["topology_id", "name", "type"],
        },
    },
}


def _add_topology_node(
    topology_id: str,
    name: str,
    type: str,
    x: float | None = None,
    y: float | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    import uuid, random

    topo = topology_service.get_topology(topology_id)
    if not topo:
        return {"error": f"拓扑 {topology_id} 不存在"}

    nodes = list(topo.get("nodes", []))
    new_node = {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": type,
        "x": x if x is not None else random.uniform(100, 600),
        "y": y if y is not None else random.uniform(100, 400),
        "properties": {},
    }
    nodes.append(new_node)

    updated = topology_service.update_topology(
        topology_id,
        nodes=nodes,
        links=topo.get("links", []),
    )
    return {"node": new_node, "topology": updated}


# ---------------------------------------------------------------------------
# Tool: add_topology_link
# ---------------------------------------------------------------------------

_ADD_LINK_SCHEMA = {
    "type": "function",
    "function": {
        "name": "add_topology_link",
        "description": "在指定拓扑的两个节点之间添加一条链路。source 和 target 为节点 ID 或节点名称。",
        "parameters": {
            "type": "object",
            "properties": {
                "topology_id": {"type": "string", "description": "拓扑 ID"},
                "source": {"type": "string", "description": "源节点 ID 或名称"},
                "target": {"type": "string", "description": "目标节点 ID 或名称"},
                "bandwidth": {"type": "string", "description": "带宽，例如 1Gbps", "default": "1Gbps"},
                "delay": {"type": "string", "description": "延迟，例如 10ms", "default": "10ms"},
            },
            "required": ["topology_id", "source", "target"],
        },
    },
}


def _resolve_node_id(nodes: list[dict], identifier: str) -> str | None:
    for n in nodes:
        if n.get("id") == identifier or n.get("name") == identifier:
            return n["id"]
    return None


def _add_topology_link(
    topology_id: str,
    source: str,
    target: str,
    bandwidth: str = "1Gbps",
    delay: str = "10ms",
    **_kwargs: Any,
) -> dict[str, Any]:
    import uuid

    topo = topology_service.get_topology(topology_id)
    if not topo:
        return {"error": f"拓扑 {topology_id} 不存在"}

    nodes = topo.get("nodes", [])
    source_id = _resolve_node_id(nodes, source)
    target_id = _resolve_node_id(nodes, target)
    if not source_id:
        return {"error": f"源节点 '{source}' 不存在"}
    if not target_id:
        return {"error": f"目标节点 '{target}' 不存在"}

    links = list(topo.get("links", []))
    new_link = {
        "id": str(uuid.uuid4()),
        "source": source_id,
        "target": target_id,
        "bandwidth": bandwidth,
        "delay": delay,
    }
    links.append(new_link)

    updated = topology_service.update_topology(
        topology_id,
        nodes=nodes,
        links=links,
    )
    return {"link": new_link, "topology": updated}


# ---------------------------------------------------------------------------
# Tool: remove_topology_node
# ---------------------------------------------------------------------------

_REMOVE_NODE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "remove_topology_node",
        "description": "从指定拓扑中删除一个节点（同时删除关联的链路）。",
        "parameters": {
            "type": "object",
            "properties": {
                "topology_id": {"type": "string", "description": "拓扑 ID"},
                "node_identifier": {
                    "type": "string",
                    "description": "节点 ID 或名称",
                },
            },
            "required": ["topology_id", "node_identifier"],
        },
    },
}


def _remove_topology_node(
    topology_id: str,
    node_identifier: str,
    **_kwargs: Any,
) -> dict[str, Any]:
    topo = topology_service.get_topology(topology_id)
    if not topo:
        return {"error": f"拓扑 {topology_id} 不存在"}

    nodes = topo.get("nodes", [])
    node_id = _resolve_node_id(nodes, node_identifier)
    if not node_id:
        return {"error": f"节点 '{node_identifier}' 不存在"}

    remaining_nodes = [n for n in nodes if n["id"] != node_id]
    remaining_links = [
        l for l in topo.get("links", [])
        if l.get("source") != node_id and l.get("target") != node_id
    ]

    updated = topology_service.update_topology(
        topology_id,
        nodes=remaining_nodes,
        links=remaining_links,
    )
    return {"removed_node_id": node_id, "topology": updated}


# ---------------------------------------------------------------------------
# Tool: create_topology
# ---------------------------------------------------------------------------

_CREATE_TOPOLOGY_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_topology",
        "description": "在指定项目中创建一个新拓扑。",
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "项目 ID"},
                "name": {"type": "string", "description": "拓扑名称"},
                "nodes": {
                    "type": "array",
                    "description": "初始节点列表（可选）",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                        },
                        "required": ["name", "type"],
                    },
                },
                "links": {
                    "type": "array",
                    "description": "初始链路列表（可选，source/target 为节点名称）",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"},
                        },
                        "required": ["source", "target"],
                    },
                },
            },
            "required": ["projectId", "name"],
        },
    },
}


def _create_topology(
    projectId: str,
    name: str,
    nodes: list[dict] | None = None,
    links: list[dict] | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    import uuid, random

    node_list = []
    name_to_id: dict[str, str] = {}
    for n in (nodes or []):
        nid = str(uuid.uuid4())
        name_to_id[n["name"]] = nid
        node_list.append({
            "id": nid,
            "name": n["name"],
            "type": n["type"],
            "x": random.uniform(100, 600),
            "y": random.uniform(100, 400),
            "properties": {},
        })

    link_list = []
    for l in (links or []):
        src_id = name_to_id.get(l["source"])
        tgt_id = name_to_id.get(l["target"])
        if src_id and tgt_id:
            link_list.append({
                "id": str(uuid.uuid4()),
                "source": src_id,
                "target": tgt_id,
                "bandwidth": "1Gbps",
                "delay": "10ms",
            })

    result = topology_service.create_topology(
        name=name,
        project_id=projectId,
        nodes=node_list,
        links=link_list,
    )
    return result


# ---------------------------------------------------------------------------
# Register all
# ---------------------------------------------------------------------------

register_tool("list_topologies", _LIST_TOPOLOGIES_SCHEMA, _list_topologies)
register_tool("get_topology", _GET_TOPOLOGY_SCHEMA, _get_topology)
register_tool("add_topology_node", _ADD_NODE_SCHEMA, _add_topology_node)
register_tool("add_topology_link", _ADD_LINK_SCHEMA, _add_topology_link)
register_tool("remove_topology_node", _REMOVE_NODE_SCHEMA, _remove_topology_node)
register_tool("create_topology", _CREATE_TOPOLOGY_SCHEMA, _create_topology)
