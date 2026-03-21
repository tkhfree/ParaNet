from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.core.responses import ok
from app.services import deploy_service

router = APIRouter(prefix="/deployments", tags=["deploy"])


def _body_compile_artifact_id(body: dict) -> str:
    return str(body.get("compileArtifactId") or body.get("intentId") or "").strip()


@router.get("")
def list_deployments(pageNo: int = 1, pageSize: int = 10, projectId: str | None = None):
    result = deploy_service.list_deployments(page_no=pageNo, page_size=pageSize, project_id=projectId)
    return ok(result)


@router.get("/{id}")
def get_deployment(id: str):
    dep = deploy_service.get_deployment(id)
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="部署不存在")
    return ok(dep)


@router.post("")
async def create_deployment(body: dict, background_tasks: BackgroundTasks):
    intent_id = _body_compile_artifact_id(body)
    topology_id = body.get("topologyId", "")
    project_id = body.get("projectId")
    dry_run = body.get("dryRun", False)
    deploy_id = deploy_service.prepare_deployment(
        intent_id, topology_id, project_id=project_id, dry_run=dry_run
    )
    background_tasks.add_task(
        deploy_service.run_deployment_job,
        deploy_id,
        intent_id,
        topology_id,
        project_id,
        dry_run,
    )
    dep = deploy_service.get_deployment(deploy_id)
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
    intent_id = _body_compile_artifact_id(body)
    topology_id = body.get("topologyId", "")
    project_id = body.get("projectId")
    result = deploy_service.validate(intent_id, topology_id, project_id)
    return ok(result)


@router.post("/preview")
def preview(body: dict):
    intent_id = _body_compile_artifact_id(body)
    topology_id = body.get("topologyId", "")
    project_id = body.get("projectId")
    result = deploy_service.preview(intent_id, topology_id, project_id)
    return ok(result)
