from __future__ import annotations

import json
import uuid
from typing import Any

from paranet.agent.core.events.action import TopologyAction
from paranet.agent.core.events.observation import TopologyObservation, Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import topology_service
    return topology_service


def _json_content(data: Any) -> str:
    if isinstance(data, (list, dict)):
        return json.dumps(data, ensure_ascii=False, indent=2)
    return str(data)


class TopologyToolHandler:
    def handle(self, action: TopologyAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}
        topo_id = (action.topology_id or "").strip()

        try:
            if op == "list":
                return self._list(params)
            elif op == "get":
                return self._get(topo_id)
            elif op == "create":
                return self._create(params)
            elif op == "update":
                return self._update(topo_id, params)
            elif op == "delete":
                return self._delete(topo_id)
            elif op == "add_node":
                return self._add_node(topo_id, params)
            elif op == "add_link":
                return self._add_link(topo_id, params)
            elif op == "remove_node":
                return self._remove_node(topo_id, params)
            elif op == "remove_link":
                return self._remove_link(topo_id, params)
            elif op == "export":
                return self._export(topo_id)
            elif op == "import":
                return self._import(params)
            elif op == "snapshot":
                return self._snapshot(topo_id)
            else:
                return Observation(content=f"Unknown topology operation: {op}")
        except Exception as exc:
            return Observation(content=f"Topology operation '{op}' failed: {exc}")

    def _list(self, params: dict) -> Observation:
        svc = _get_service()
        project_id = params.get("project_id")
        result = svc.list_topologies(page_no=1, page_size=50, project_id=project_id)
        return Observation(content=_json_content(result))

    def _get(self, topo_id: str) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'get' operation.")
        svc = _get_service()
        topo = svc.get_topology(topo_id)
        if not topo:
            return Observation(content=f"Topology {topo_id} not found.")
        return Observation(content=_json_content(topo))

    def _create(self, params: dict) -> Observation:
        svc = _get_service()
        name = params.get("name", "Agent generated topology")
        nodes = params.get("nodes", [])
        links = params.get("links", [])
        project_id = params.get("project_id")
        # Auto-generate IDs for nodes/links if missing
        for node in nodes:
            if not node.get("id"):
                node["id"] = str(uuid.uuid4())
            if not node.get("position"):
                node["position"] = {"x": 100, "y": 100}
        for link in links:
            if not link.get("id"):
                link["id"] = str(uuid.uuid4())
        topo = svc.create_topology(name=name, nodes=nodes, links=links, project_id=project_id)
        return Observation(content=f"Topology created successfully:\n{_json_content(topo)}")

    def _update(self, topo_id: str, params: dict) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'update' operation.")
        svc = _get_service()
        result = svc.update_topology(
            topo_id,
            name=params.get("name"),
            nodes=params.get("nodes"),
            links=params.get("links"),
            project_id=params.get("project_id"),
        )
        if not result:
            return Observation(content=f"Topology {topo_id} not found.")
        return Observation(content=f"Topology updated:\n{_json_content(result)}")

    def _delete(self, topo_id: str) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'delete' operation.")
        svc = _get_service()
        if svc.delete_topology(topo_id):
            return Observation(content=f"Topology {topo_id} deleted.")
        return Observation(content=f"Topology {topo_id} not found.")

    def _add_node(self, topo_id: str, params: dict) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'add_node'.")
        node = params.get("node", {})
        if not node.get("id"):
            node["id"] = str(uuid.uuid4())
        if not node.get("position"):
            node["position"] = {"x": 100, "y": 100}
        svc = _get_service()
        topo = svc.get_topology(topo_id)
        if not topo:
            return Observation(content=f"Topology {topo_id} not found.")
        nodes = list(topo.get("nodes", []))
        nodes.append(node)
        svc.update_topology(topo_id, nodes=nodes)
        return Observation(content=f"Node '{node.get('name', node['id'])}' added to topology {topo_id}.")

    def _add_link(self, topo_id: str, params: dict) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'add_link'.")
        link = params.get("link", {})
        if not link.get("id"):
            link["id"] = str(uuid.uuid4())
        svc = _get_service()
        topo = svc.get_topology(topo_id)
        if not topo:
            return Observation(content=f"Topology {topo_id} not found.")
        links = list(topo.get("links", []))
        links.append(link)
        svc.update_topology(topo_id, links=links)
        return Observation(content=f"Link {link['source']}->{link['target']} added to topology {topo_id}.")

    def _remove_node(self, topo_id: str, params: dict) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'remove_node'.")
        item_id = params.get("item_id", "")
        svc = _get_service()
        topo = svc.get_topology(topo_id)
        if not topo:
            return Observation(content=f"Topology {topo_id} not found.")
        nodes = [n for n in topo.get("nodes", []) if n.get("id") != item_id]
        links = [l for l in topo.get("links", []) if l.get("source") != item_id and l.get("target") != item_id]
        svc.update_topology(topo_id, nodes=nodes, links=links)
        return Observation(content=f"Node {item_id} and its links removed from topology {topo_id}.")

    def _remove_link(self, topo_id: str, params: dict) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'remove_link'.")
        item_id = params.get("item_id", "")
        svc = _get_service()
        topo = svc.get_topology(topo_id)
        if not topo:
            return Observation(content=f"Topology {topo_id} not found.")
        links = [l for l in topo.get("links", []) if l.get("id") != item_id]
        svc.update_topology(topo_id, links=links)
        return Observation(content=f"Link {item_id} removed from topology {topo_id}.")

    def _export(self, topo_id: str) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'export'.")
        svc = _get_service()
        result = svc.export_topology(topo_id)
        if not result:
            return Observation(content=f"Topology {topo_id} not found or export failed.")
        return Observation(content=_json_content(result))

    def _import(self, params: dict) -> Observation:
        svc = _get_service()
        name = params.get("name", "Imported topology")
        project_id = params.get("project_id")
        nodes = params.get("nodes", [])
        links = params.get("links", [])
        result = svc.import_topology(name=name, description=params.get("description", ""), nodes=nodes, links=links, project_id=project_id)
        return Observation(content=f"Topology imported:\n{_json_content(result)}")

    def _snapshot(self, topo_id: str) -> Observation:
        if not topo_id:
            return Observation(content="Error: topology_id is required for 'snapshot'.")
        svc = _get_service()
        result = svc.get_topology_snapshot(topo_id)
        if not result:
            return Observation(content=f"Topology {topo_id} not found.")
        return Observation(content=_json_content(result))
