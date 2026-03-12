from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import editor_project_service

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
        project = editor_project_service.update_project(
            project_id,
            name=body.get("name"),
            remark=body.get("remark"),
            topologyId=body.get("topologyId"),
            currentFileId=body.get("currentFileId"),
            lastIntentId=body.get("lastIntentId"),
        )
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
