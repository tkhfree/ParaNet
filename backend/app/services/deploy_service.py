from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

from app.services import intent_service

_store: dict[str, dict[str, Any]] = {}
_logs: dict[str, list[dict]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_deployments(page_no: int = 1, page_size: int = 10, project_id: str | None = None) -> dict:
    records = list(_store.values())
    if project_id:
        records = [record for record in records if record.get("projectId") == project_id]
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


def execute_deployment(
    intent_id: str,
    topology_id: str,
    project_id: str | None = None,
    dry_run: bool = False,
) -> dict:
    deploy_id = str(uuid.uuid4())
    now = _now()
    preview_data = preview(intent_id, topology_id, project_id)
    dep = {
        "id": deploy_id,
        "intentId": intent_id,
        "topologyId": topology_id,
        "projectId": project_id,
        "status": "completed" if dry_run else "completed",
        "progress": 100,
        "logs": [],
        "previewConfig": preview_data["configs"],
        "createdAt": now,
        "completedAt": now,
    }
    _store[deploy_id] = dep
    _logs[deploy_id] = [
        {"timestamp": now, "level": "info", "message": "开始准备部署配置", "nodeId": None},
        {"timestamp": now, "level": "info", "message": "已完成设备配置下发（模拟）", "nodeId": None},
        {"timestamp": now, "level": "info", "message": "部署已完成", "nodeId": None},
    ]
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


def validate(intent_id: str, topology_id: str, project_id: str | None = None) -> dict:
    return {"valid": True, "message": "校验通过"}


def preview(intent_id: str, topology_id: str, project_id: str | None = None) -> dict:
    intent = intent_service.get_intent(intent_id)
    if intent and intent.get("compiledConfig"):
        return {"configs": intent["compiledConfig"]}

    compile_result = intent_service.compile_preview(
        content=intent.get("content", "") if intent else "",
        topology_id=topology_id,
        project_id=project_id,
    )
    return {"configs": compile_result.get("config", {"ip": {}, "ndn": {}, "geo": {}, "p4": {}})}
