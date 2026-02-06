from datetime import datetime, timezone
from typing import Any
import json
import uuid

# In-memory store (per plan: data in new backend only)
_store: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_topologies(page_no: int = 1, page_size: int = 10) -> dict:
    records = list(_store.values())
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_topology(id: str) -> dict | None:
    return _store.get(id)


def create_topology(name: str, description: str | None = None, nodes: list | None = None, links: list | None = None) -> dict:
    id = str(uuid.uuid4())
    now = _now()
    topo = {
        "id": id,
        "name": name or "未命名拓扑",
        "description": description or "",
        "nodes": nodes or [],
        "links": links or [],
        "createdAt": now,
        "updatedAt": now,
    }
    _store[id] = topo
    return topo


def update_topology(id: str, name: str | None = None, description: str | None = None, nodes: list | None = None, links: list | None = None) -> dict | None:
    if id not in _store:
        return None
    topo = _store[id]
    if name is not None:
        topo["name"] = name
    if description is not None:
        topo["description"] = description
    if nodes is not None:
        topo["nodes"] = nodes
    if links is not None:
        topo["links"] = links
    topo["updatedAt"] = _now()
    return topo


def delete_topology(id: str) -> bool:
    if id in _store:
        del _store[id]
        return True
    return False


def export_topology(id: str) -> bytes | None:
    topo = _store.get(id)
    if not topo:
        return None
    return json.dumps(topo, ensure_ascii=False, indent=2).encode("utf-8")


def import_topology(name: str | None, description: str | None, nodes: list | None, links: list | None) -> dict:
    return create_topology(name or "导入的拓扑", description, nodes, links)
