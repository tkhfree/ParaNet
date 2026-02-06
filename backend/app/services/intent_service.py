from datetime import datetime, timezone
from typing import Any
import uuid

_store: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_intents(page_no: int = 1, page_size: int = 10, status: str | None = None) -> dict:
    records = list(_store.values())
    if status:
        records = [r for r in records if r.get("status") == status]
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_intent(id: str) -> dict | None:
    return _store.get(id)


def create_intent(name: str, description: str | None, type: str, content: str, topology_id: str | None) -> dict:
    intent_id = str(uuid.uuid4())
    now = _now()
    intent = {
        "id": intent_id,
        "name": name,
        "description": description or "",
        "type": type or "dsl",
        "content": content or "",
        "status": "draft",
        "compiledConfig": None,
        "createdAt": now,
        "updatedAt": now,
        "deployedAt": None,
        "topologyId": topology_id,
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
    return {"success": True, "config": {}, "errors": [], "warnings": []}


def compile_preview(content: str, topology_id: str | None) -> dict:
    return {"success": True, "config": {}, "errors": [], "warnings": []}


def translate_natural_language(input_text: str, context: dict | None) -> dict:
    return {
        "dslCode": "# Mock DSL from: " + (input_text or ""),
        "explanation": "意图解析功能需接入 paranet.agent 后生效",
        "suggestions": [],
    }
