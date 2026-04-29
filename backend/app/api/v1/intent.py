from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import intent_service

# ---------------------------------------------------------------------------
# 编译产物（部署输入）HTTP 资源
#
# - 主路径：/api/compile-artifacts（推荐，OpenAPI 分组名与业务一致）
# - 兼容路径：/api/intents（历史客户端仍可用）
# 请求体中 compileArtifactId 与 intentId 同义，优先使用 compileArtifactId。
# ---------------------------------------------------------------------------

_TAG = "编译产物"
_NOT_FOUND = "未找到该编译产物记录"


def _body_artifact_id(body: dict) -> str:
    return str(body.get("compileArtifactId") or body.get("intentId") or "").strip()


_core = APIRouter(tags=[_TAG])


@_core.get("", summary="列出编译产物记录")
def list_compile_artifacts(
    pageNo: int = 1, pageSize: int = 10, status: str | None = None, projectId: str | None = None
):
    result = intent_service.list_intents(
        page_no=pageNo,
        page_size=pageSize,
        status=status,
        project_id=projectId,
    )
    return ok(result)


@_core.get("/{id}", summary="获取单条编译产物记录")
def get_compile_artifact(id: str):
    record = intent_service.get_intent(id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return ok(record)


@_core.post("", summary="创建编译产物记录")
def create_compile_artifact(body: dict):
    name = body.get("name", "未命名编译产物")
    description = body.get("description")
    type_ = body.get("type", "dsl")
    content = body.get("content", "")
    topology_id = body.get("topologyId")
    project_id = body.get("projectId")
    record = intent_service.create_intent(name, description, type_, content, topology_id, project_id)
    return ok(record)


@_core.put("/{id}", summary="更新编译产物记录")
def update_compile_artifact(id: str, body: dict):
    record = intent_service.update_intent(
        id,
        name=body.get("name"),
        description=body.get("description"),
        type=body.get("type"),
        content=body.get("content"),
        topologyId=body.get("topologyId"),
        projectId=body.get("projectId"),
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return ok(record)


@_core.delete("/{id}", summary="删除编译产物记录")
def delete_compile_artifact(id: str):
    if not intent_service.delete_intent(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND)
    return ok(None)


@_core.post("/compile", summary="按记录重新编译")
def compile_saved_record(body: dict):
    artifact_id = _body_artifact_id(body)
    topology_id = body.get("topologyId", "")
    result = intent_service.compile_intent(artifact_id, topology_id)
    return ok(result)


@_core.post("/compile-preview", summary="编译预览（不落库）")
def compile_preview(body: dict):
    content = body.get("content", "")
    topology_id = body.get("topologyId")
    project_id = body.get("projectId")
    result = intent_service.compile_preview(content, topology_id, project_id)
    return ok(result)


@_core.post("/save-deploy-artifacts", summary="编译并写入项目 output/")
def save_deploy_artifacts(body: dict):
    project_id = str(body.get("projectId", "")).strip()
    if not project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 projectId")
    content = body.get("content", "")
    topology_id = body.get("topologyId")
    artifact_id = body.get("compileArtifactId") or body.get("intentId")
    name = body.get("name")
    description = body.get("description")
    result = intent_service.save_deploy_artifacts(
        project_id,
        content,
        topology_id,
        intent_id=artifact_id,
        name=name,
        description=description,
    )
    return ok(result)


# 推荐路径
router = APIRouter()
router.include_router(_core, prefix="/compile-artifacts")

# 历史路径 /api/intents/*
router_legacy = APIRouter()
router_legacy.include_router(_core, prefix="/intents")
