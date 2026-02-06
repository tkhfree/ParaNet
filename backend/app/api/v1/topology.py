import json
from typing import Any

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import Response

from app.core.responses import ok
from app.services import topology_service

router = APIRouter(prefix="/topologies", tags=["topology"])


@router.get("")
def list_topologies(pageNo: int = 1, pageSize: int = 10):
    result = topology_service.list_topologies(page_no=pageNo, page_size=pageSize)
    return ok(result)


@router.get("/{id}")
def get_topology(id: str):
    topo = topology_service.get_topology(id)
    if not topo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="拓扑不存在")
    return ok(topo)


@router.post("")
def create_topology(body: dict):
    name = body.get("name", "未命名拓扑")
    description = body.get("description")
    nodes = body.get("nodes", [])
    links = body.get("links", [])
    topo = topology_service.create_topology(name, description, nodes, links)
    return ok(topo)


@router.put("/{id}")
def update_topology(id: str, body: dict):
    topo = topology_service.update_topology(
        id,
        name=body.get("name"),
        description=body.get("description"),
        nodes=body.get("nodes"),
        links=body.get("links"),
    )
    if not topo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="拓扑不存在")
    return ok(topo)


@router.delete("/{id}")
def delete_topology(id: str):
    if not topology_service.delete_topology(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="拓扑不存在")
    return ok(None)


@router.get("/{id}/export")
def export_topology(id: str, format: str = "json"):
    data = topology_service.export_topology(id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="拓扑不存在")
    return Response(
        content=data,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="topology-{id}.json"'},
    )


@router.post("/import")
async def import_topology(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
        data = json.loads(text)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 JSON 文件")
    name = data.get("name", file.filename or "导入的拓扑")
    if isinstance(name, str) and name.endswith(".json"):
        name = name[:-5]
    description = data.get("description")
    nodes = data.get("nodes", [])
    links = data.get("links", [])
    topo = topology_service.import_topology(name, description, nodes, links)
    return ok(topo)
