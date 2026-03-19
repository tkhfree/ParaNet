from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

from compiler import compile_pne_text_to_program_ir

from app.services import topology_service

_store: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_intents(
    page_no: int = 1,
    page_size: int = 10,
    status: str | None = None,
    project_id: str | None = None,
) -> dict:
    records = list(_store.values())
    if status:
        records = [r for r in records if r.get("status") == status]
    if project_id:
        records = [r for r in records if r.get("projectId") == project_id]
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_intent(id: str) -> dict | None:
    return _store.get(id)


def create_intent(
    name: str,
    description: str | None,
    type: str,
    content: str,
    topology_id: str | None,
    project_id: str | None = None,
) -> dict:
    intent_id = str(uuid.uuid4())
    now = _now()
    compile_payload = _build_compile_payload(content, topology_id)
    intent = {
        "id": intent_id,
        "name": name,
        "description": description or "",
        "type": type or "dsl",
        "content": content or "",
        "status": "draft",
        "compiledConfig": compile_payload["config"],
        "lastCompileResult": compile_payload,
        "createdAt": now,
        "updatedAt": now,
        "deployedAt": None,
        "topologyId": topology_id,
        "projectId": project_id,
    }
    _store[intent_id] = intent
    return intent


def update_intent(id: str, **kwargs: Any) -> dict | None:
    if id not in _store:
        return None
    intent = _store[id]
    for k, v in kwargs.items():
        if v is not None:
            intent[k] = v
    intent["updatedAt"] = _now()
    return intent


def delete_intent(id: str) -> bool:
    if id in _store:
        del _store[id]
        return True
    return False


def compile_intent(intent_id: str, topology_id: str) -> dict:
    intent = _store.get(intent_id)
    if not intent:
        return {"success": False, "errors": ["意图不存在"], "warnings": []}
    result = _build_compile_payload(intent.get("content", ""), topology_id)
    intent["compiledConfig"] = result["config"]
    intent["lastCompileResult"] = result
    intent["status"] = "compiled" if result["success"] else "failed"
    intent["updatedAt"] = _now()
    return result


def compile_preview(content: str, topology_id: str | None, project_id: str | None = None) -> dict:
    result = _build_compile_payload(content, topology_id)
    result["projectId"] = project_id
    return result


def translate_natural_language(input_text: str, context: dict | None) -> dict:
    return {
        "dslCode": "# Mock DSL from: " + (input_text or ""),
        "explanation": "意图解析功能需接入 paranet.agent 后生效",
        "suggestions": [],
    }


def _build_compile_payload(content: str, topology_id: str | None) -> dict:
    topo = topology_service.get_topology(topology_id) if topology_id else None
    pne_text = (content or "").strip()
    if not pne_text:
        return {
            "success": False,
            "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
            "errors": ["DSL 内容为空，无法编译"],
            "warnings": [],
            "ast": None,
            "globalIr": None,
            "deviceIr": [],
            "logs": [],
        }

    logs: list[dict[str, Any]] = [
        {"timestamp": _now(), "level": "info", "message": "开始编译（按扩展 PNE 解析，支持可选 intent 块）"},
    ]

    try:
        program = compile_pne_text_to_program_ir(pne_text, topology_snapshot=topo, file_name="<content>")
    except ValueError as pne_err:
        return {
            "success": False,
            "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
            "errors": [f"PNE: {pne_err}"],
            "warnings": [],
            "ast": None,
            "globalIr": None,
            "deviceIr": [],
            "logs": logs,
        }

    return {
        "success": True,
        "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
        "errors": [],
        "warnings": [],
        "ast": {"type": "ProgramIR", "value": program.to_dict()},
        "globalIr": {"summary": {"moduleCount": len(program.modules), "topologyId": topology_id}},
        "deviceIr": [],
        "logs": logs + [{"timestamp": _now(), "level": "info", "message": "语义收集完成"}],
    }
