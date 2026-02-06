"""
WebSocket 端点：遥测、部署进度、告警推送。
路径与前端约定一致：/ws/telemetry、/ws/deployments/{id}/progress、/ws/alerts
"""
import asyncio
import json
from datetime import datetime, timezone
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# 连接池：便于广播
_telemetry_connections: Set[WebSocket] = set()
_deploy_connections: dict[str, set[WebSocket]] = {}
_alerts_connections: Set[WebSocket] = set()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _send_json(ws: WebSocket, data: dict) -> None:
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def _broadcast_telemetry(payload: dict) -> None:
    dead = set()
    for ws in _telemetry_connections:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _telemetry_connections.discard(ws)


async def _broadcast_alerts(payload: dict) -> None:
    dead = set()
    for ws in _alerts_connections:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _alerts_connections.discard(ws)


def broadcast_deploy_progress_sync(deploy_id: str, event: dict) -> None:
    """由 deploy_service 在步骤执行时调用，向该 deploy 的订阅连接推送进度（需在事件循环中调用）。"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_push_to_deploy_connections(deploy_id, event))
    except RuntimeError:
        pass


async def _push_to_deploy_connections(deploy_id: str, event: dict) -> None:
    conns = _deploy_connections.get(deploy_id)
    if not conns:
        return
    dead = set()
    for ws in list(conns):
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    for ws in dead:
        conns.discard(ws)
    if not conns:
        _deploy_connections.pop(deploy_id, None)


def broadcast_alert_sync(alert: dict) -> None:
    """由 monitor 在新增/更新告警时调用，向 /ws/alerts 订阅者广播。"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_broadcast_alerts({"type": "alert", "data": alert}))
    except RuntimeError:
        pass


@router.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket) -> None:
    await websocket.accept()
    _telemetry_connections.add(websocket)
    try:
        while True:
            payload = {
                "type": "telemetry",
                "timestamp": _now_iso(),
                "nodes": [],
                "links": [],
            }
            await _send_json(websocket, payload)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass
    finally:
        _telemetry_connections.discard(websocket)


@router.websocket("/ws/deployments/{deploy_id}/progress")
async def ws_deploy_progress(websocket: WebSocket, deploy_id: str) -> None:
    await websocket.accept()
    conns = _deploy_connections.setdefault(deploy_id, set())
    conns.add(websocket)
    try:
        # 可选：若该部署已有日志，先推送一条当前状态
        from app.services import deploy_service
        dep = deploy_service.get_deployment(deploy_id)
        if dep:
            await _send_json(websocket, {
                "deploymentId": deploy_id,
                "status": dep.get("status"),
                "progress": dep.get("progress", 0),
            })
        # 心跳，保持连接并可后续由 deploy_service 通过 broadcast_deploy_progress_sync 推送
        while True:
            await asyncio.sleep(30)
            try:
                await _send_json(websocket, {"deploymentId": deploy_id, "heartbeat": True})
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        conns.discard(websocket)
        if not conns:
            _deploy_connections.pop(deploy_id, None)


@router.websocket("/ws/deploy/{deploy_id}")
async def ws_deploy_legacy(websocket: WebSocket, deploy_id: str) -> None:
    """与计划中的 /ws/deploy/{deploy_id} 一致，行为同 deployments/{id}/progress。"""
    await ws_deploy_progress(websocket, deploy_id)


@router.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket) -> None:
    await websocket.accept()
    _alerts_connections.add(websocket)
    try:
        while True:
            await _send_json(websocket, {"type": "heartbeat", "timestamp": _now_iso()})
            await asyncio.sleep(15)
    except WebSocketDisconnect:
        pass
    finally:
        _alerts_connections.discard(websocket)
