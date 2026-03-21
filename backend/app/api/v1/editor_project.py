from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import editor_project_check_service, editor_project_service

router = APIRouter(prefix="/project", tags=["editor-project"])


@router.get("/projectList")
def get_project_list():
    return ok(editor_project_service.list_projects())


@router.post("/createProject")
def create_project(body: dict):
    try:
        project = editor_project_service.create_project(
            name=body.get("name", "未命名项目"),
            remark=body.get("remark"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(project)


@router.post("/updateProject")
def update_project(body: dict):
    project_id = body.get("id")
    if not project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少项目 ID")
    try:
        kwargs: dict = {}
        for k in ("name", "remark", "topologyId", "currentFileId"):
            if k in body:
                kwargs[k] = body[k]
        if "lastCompileArtifactId" in body or "lastIntentId" in body:
            kwargs["lastCompileArtifactId"] = body.get("lastCompileArtifactId", body.get("lastIntentId"))
        project = editor_project_service.update_project(project_id, **kwargs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return ok(project)


@router.get("/deleteProject/{project_id}")
def delete_project(project_id: str):
    if not editor_project_service.delete_project(project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return ok(None)


@router.get("/getProject/{project_id}")
def get_project(project_id: str):
    project = editor_project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return ok(project)


@router.get("/checkProjectNameExists")
def check_project_name_exists(name: str, excludeId: str | None = None):
    return ok(editor_project_service.check_project_name_exists(name, excludeId))


@router.post("/checkProjectResources")
async def check_project_resources(body: dict):
    """刷新时：SSH 探测、物化拓扑与 output 产物检查。"""
    project_id = body.get("projectId")
    if not project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少 projectId")
    result = await editor_project_check_service.check_project_resources_async(
        str(project_id),
        topology_id=body.get("topologyId"),
        compile_artifact_id=body.get("compileArtifactId") or body.get("intentId"),
    )
    return ok(result)
