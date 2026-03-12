from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.responses import ok
from app.services import editor_file_service

router = APIRouter(prefix="/file", tags=["editor-file"])


@router.get("/tree/{project_id}")
def get_project_file_tree(project_id: str):
    return ok(editor_file_service.get_project_file_tree(project_id))


@router.post("/createFile")
def create_file(body: dict):
    try:
        file_record = editor_file_service.create_file(
            project_id=str(body.get("projectId", "")),
            file_name=body.get("fileName", ""),
            is_folder=int(body.get("isFolder", 0)),
            parent_id=body.get("parentId"),
            file_type=int(body.get("fileType", 4)),
            content=body.get("content"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(file_record)


@router.get("/readFile/{file_id}")
def read_file(file_id: str):
    try:
        content = editor_file_service.read_file(file_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(content)


@router.post("/updateFileContent")
def update_file_content(body: dict):
    try:
        result = editor_file_service.update_file_content(
            file_id=str(body.get("fileId", "")),
            content=body.get("content", ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(result)


@router.post("/delete")
def delete_file(body: dict):
    try:
        editor_file_service.delete_file(str(body.get("fileId", "")))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(None)


@router.post("/renameFile")
def rename_file(body: dict):
    try:
        result = editor_file_service.rename_file(
            str(body.get("fileId", "")),
            body.get("fileName", ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(result)


@router.post("/moveFile")
def move_file(body: dict):
    try:
        result = editor_file_service.move_file(
            str(body.get("fileId", "")),
            body.get("parentId"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(result)


@router.get("/export")
def export_files(projectId: str, fileIds: list[str] | None = None):
    try:
        content = editor_file_service.export_files(projectId, fileIds)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="project-{projectId}.zip"'},
    )


@router.post("/import")
async def import_zip(projectId: str, parentId: str | None = None, file: UploadFile = File(...)):
    try:
        await editor_file_service.import_zip(projectId, parentId, file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ok(None)


@router.post("/getJsonContentByProjectId")
def get_json_content_by_project_id(projectId: str):
    return ok(editor_file_service.get_json_content_by_project_id(projectId))
