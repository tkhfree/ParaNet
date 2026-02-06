from datetime import datetime, timezone
from typing import Any
import uuid

_store: dict[str, dict[str, Any]] = {}
_logs: dict[str, list[dict]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_deployments(page_no: int = 1, page_size: int = 10) -> dict:
    records = list(_store.values())
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_deployment(id: str) -> dict | None:
    d = _store.get(id)
    if d:
        d = dict(d)
        d["logs"] = _logs.get(id, [])
    return d


def execute_deployment(intent_id: str, topology_id: str, dry_run: bool = False) -> dict:
    deploy_id = str(uuid.uuid4())
    now = _now()
    dep = {
        "id": deploy_id,
        "intentId": intent_id,
        "topologyId": topology_id,
        "status": "completed" if dry_run else "completed",
        "progress": 100,
        "logs": [],
        "createdAt": now,
        "completedAt": now,
    }
    _store[deploy_id] = dep
    _logs[deploy_id] = [{"timestamp": now, "level": "info", "message": "Mock deploy completed", "nodeId": None}]
    dep["logs"] = _logs[deploy_id]
    return dep


def get_logs(id: str) -> list[dict]:
    return _logs.get(id, [])


def rollback(id: str) -> dict | None:
    if id not in _store:
        return None
    dep = _store[id]
    dep["status"] = "rolled_back"
    dep["completedAt"] = _now()
    return dep


def cancel(id: str) -> None:
    if id in _store:
        _store[id]["status"] = "cancelled"
        _store[id]["completedAt"] = _now()


def validate(intent_id: str, topology_id: str) -> dict:
    return {"valid": True, "message": "校验通过"}


def preview(intent_id: str, topology_id: str) -> dict:
    return {"configs": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}}}
