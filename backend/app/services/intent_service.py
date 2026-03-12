from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import uuid

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
    stripped_lines = [line for line in (content or "").splitlines() if line.strip()]
    statements = [
        {
            "line": index + 1,
            "kind": "statement" if not line.strip().startswith("#") else "comment",
            "text": line,
        }
        for index, line in enumerate(stripped_lines)
    ]
    device_names = ["core-1", "edge-1"]
    config = {
        "ip": {
            "routes": [line.strip() for line in stripped_lines[:3]],
            "topologyId": topology_id,
        },
        "ndn": {"policies": len(stripped_lines)},
        "geo": {"regions": ["global"] if stripped_lines else []},
        "p4": {"pipelines": ["ingress", "egress"] if stripped_lines else []},
    }
    return {
        "success": bool(stripped_lines),
        "config": config,
        "errors": [] if stripped_lines else ["DSL 内容为空，无法编译"],
        "warnings": [] if stripped_lines else ["请输入 DSL 后再编译"],
        "ast": {
            "type": "Program",
            "children": statements,
        },
        "globalIr": {
            "summary": {
                "statementCount": len(statements),
                "topologyId": topology_id,
            },
            "instructions": [
                {
                    "id": f"ir-{index + 1}",
                    "op": "apply_policy",
                    "source": statement["text"],
                }
                for index, statement in enumerate(statements)
            ],
        },
        "deviceIr": [
            {
                "deviceId": device_name,
                "instructions": [
                    {
                        "id": f"{device_name}-{index + 1}",
                        "action": "install_rule",
                        "source": statement["text"],
                    }
                    for index, statement in enumerate(statements)
                ],
            }
            for device_name in device_names
        ],
        "logs": [
            {
                "timestamp": _now(),
                "level": "info",
                "message": "开始解析 DSL",
            },
            {
                "timestamp": _now(),
                "level": "info",
                "message": f"完成 AST 构建，生成 {len(statements)} 条语句",
            },
            {
                "timestamp": _now(),
                "level": "info",
                "message": "已完成全局 IR 与设备级 IR 切分",
            },
        ],
    }
