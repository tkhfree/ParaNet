from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import monitor_service

router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.get("/health")
def get_health():
    return ok(monitor_service.get_health())


@router.get("/metrics/nodes")
def get_node_metrics(
    nodeIds: list[str] | None = None,
    startTime: int | None = None,
    endTime: int | None = None,
    interval: int | None = None,
):
    result = monitor_service.get_node_metrics(nodeIds, startTime, endTime, interval)
    return ok(result)


@router.get("/metrics/links")
def get_link_metrics(
    linkIds: list[str] | None = None,
    startTime: int | None = None,
    endTime: int | None = None,
    interval: int | None = None,
):
    result = monitor_service.get_link_metrics(linkIds, startTime, endTime, interval)
    return ok(result)


@router.get("/alerts")
def get_alerts(acknowledged: bool | None = None, level: str | None = None):
    result = monitor_service.get_alerts(acknowledged=acknowledged, level=level)
    return ok(result)


@router.post("/alerts/{id}/acknowledge")
def acknowledge_alert(id: str):
    if not monitor_service.acknowledge_alert(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="告警不存在")
    return ok(None)


@router.get("/alert-rules")
def get_alert_rules():
    result = monitor_service.get_alert_rules()
    return ok(result)


@router.post("/alert-rules")
def create_alert_rule(body: dict):
    name = body.get("name", "")
    enabled = body.get("enabled", True)
    type_ = body.get("type", "")
    threshold = body.get("threshold", 0.0)
    duration = body.get("duration", 0)
    actions = body.get("actions", [])
    rule = monitor_service.create_alert_rule(name, enabled, type_, threshold, duration, actions)
    return ok(rule)


@router.put("/alert-rules/{id}")
def update_alert_rule(id: str, body: dict):
    rule = monitor_service.update_alert_rule(
        id,
        name=body.get("name"),
        enabled=body.get("enabled"),
        type=body.get("type"),
        threshold=body.get("threshold"),
        duration=body.get("duration"),
        actions=body.get("actions"),
    )
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="告警规则不存在")
    return ok(rule)


@router.delete("/alert-rules/{id}")
def delete_alert_rule(id: str):
    if not monitor_service.delete_alert_rule(id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="告警规则不存在")
    return ok(None)


@router.get("/terminal/logs")
def get_terminal_logs(nodeId: str | None = None, lines: int = 100):
    result = monitor_service.get_terminal_logs(nodeId, lines)
    return ok(result)
