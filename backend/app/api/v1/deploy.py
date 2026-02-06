from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import deploy_service

router = APIRouter(prefix="/deployments", tags=["deploy"])


@router.get("")
def list_deployments(pageNo: int = 1, pageSize: int = 10):
    result = deploy_service.list_deployments(page_no=pageNo, page_size=pageSize)
    return ok(result)


@router.get("/{id}")
def get_deployment(id: str):
    dep = deploy_service.get_deployment(id)
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="部署不存在")
    return ok(dep)


@router.post("")
def create_deployment(body: dict):
    intent_id = body.get("intentId", "")
    topology_id = body.get("topologyId", "")
    dry_run = body.get("dryRun", False)
    dep = deploy_service.execute_deployment(intent_id, topology_id, dry_run=dry_run)
    return ok(dep)


@router.get("/{id}/logs")
def get_logs(id: str):
    logs = deploy_service.get_logs(id)
    return ok(logs)


@router.post("/{id}/rollback")
def rollback(id: str):
    dep = deploy_service.rollback(id)
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="部署不存在")
    return ok(dep)


@router.post("/{id}/cancel")
def cancel(id: str):
    deploy_service.cancel(id)
    return ok(None)


@router.post("/validate")
def validate(body: dict):
    intent_id = body.get("intentId", "")
    topology_id = body.get("topologyId", "")
    result = deploy_service.validate(intent_id, topology_id)
    return ok(result)


@router.post("/preview")
def preview(body: dict):
    intent_id = body.get("intentId", "")
    topology_id = body.get("topologyId", "")
    result = deploy_service.preview(intent_id, topology_id)
    return ok(result)
