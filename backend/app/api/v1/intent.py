from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import intent_service

router = APIRouter(prefix="/intents", tags=["intent"])


@router.get("")
def list_intents(pageNo: int = 1, pageSize: int = 10, status: str | None = None):
    result = intent_service.list_intents(page_no=pageNo, page_size=pageSize, status=status)
    return ok(result)


@router.get("/{id}")
def get_intent(id: str):
    intent = intent_service.get_intent(id)
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="意图不存在")
    return ok(intent)


@router.post("")
def create_intent(body: dict):
    name = body.get("name", "未命名意图")
    description = body.get("description")
    type_ = body.get("type", "dsl")
    content = body.get("content", "")
    topology_id = body.get("topologyId")
    intent = intent_service.create_intent(name, description, type_, content, topology_id)
    return ok(intent)


@router.put("/{id}")
def update_intent(id: str, body: dict):
    intent = intent_service.update_intent(
        id,
        name=body.get("name"),
        description=body.get("description"),
        type=body.get("type"),
        content=body.get("content"),
        topologyId=body.get("topologyId"),
    )
    if not intent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="意图不存在")
    return ok(intent)


@router.delete("/{id}")
def delete_intent(id: str):
    if not intent_service.delete_intent(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="意图不存在")
    return ok(None)


@router.post("/compile")
def compile_intent(body: dict):
    intent_id = body.get("intentId", "")
    topology_id = body.get("topologyId", "")
    result = intent_service.compile_intent(intent_id, topology_id)
    return ok(result)


@router.post("/compile-preview")
def compile_preview(body: dict):
    content = body.get("content", "")
    topology_id = body.get("topologyId")
    result = intent_service.compile_preview(content, topology_id)
    return ok(result)


@router.post("/translate")
def translate(body: dict):
    input_text = body.get("input", "")
    context = body.get("context")
    result = intent_service.translate_natural_language(input_text, context)
    return ok(result)
