from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any
import uuid

from app.services import intent_service
from app.services import topology_service

_store: dict[str, dict[str, Any]] = {}
_logs: dict[str, list[dict]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_deployments(page_no: int = 1, page_size: int = 10, project_id: str | None = None) -> dict:
    records = list(_store.values())
    if project_id:
        records = [record for record in records if record.get("projectId") == project_id]
    total = len(records)
    start = (page_no - 1) * page_size
    end = start + page_size
    page = records[start:end]
    return {"records": page, "total": total, "pageNo": page_no, "pageSize": page_size}


def get_deployment(id: str) -> dict | None:
    d = _store.get(id)
    if d:
        d = dict(d)
        d["logs"] = _logs.get(id, [])
        iid = d.get("intentId")
        if iid is not None and d.get("compileArtifactId") is None:
            d["compileArtifactId"] = iid
    return d


def _append_log(deploy_id: str, level: str, message: str, node_id: str | None = None) -> None:
    entry = {"timestamp": _now(), "level": level, "message": message, "nodeId": node_id}
    _logs.setdefault(deploy_id, []).append(entry)
    dep = _store.get(deploy_id)
    if dep is not None:
        dep["logs"] = _logs[deploy_id]


def _append_ssh(deploy_id: str, entry: dict[str, Any]) -> None:
    dep = _store.get(deploy_id)
    if dep is None:
        return
    conns = dep.setdefault("sshConnections", [])
    conns.append(entry)


def _set_dep_fields(deploy_id: str, **fields: Any) -> None:
    dep = _store.get(deploy_id)
    if dep is None:
        return
    dep.update(fields)


def _try_ssh_connection(host: str, port: int, user: str, password: str) -> tuple[bool, str]:
    """阻塞：在 asyncio.to_thread 中调用。成功表示 TCP+SSH 握手可达。"""
    try:
        import paramiko
    except ImportError:
        return False, "未安装 paramiko，请在后端执行 pip install paramiko"

    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kw: dict[str, Any] = {
            "hostname": host,
            "port": port,
            "username": user,
            "timeout": 15,
            "allow_agent": False,
            "look_for_keys": False,
        }
        if password:
            connect_kw["password"] = password
        client.connect(**connect_kw)
        client.close()
        return True, "SSH 连接成功"
    except Exception as e:
        return False, str(e)[:240]


try_ssh_connection = _try_ssh_connection


def prepare_deployment(
    intent_id: str,
    topology_id: str,
    project_id: str | None = None,
    dry_run: bool = False,
) -> str:
    """创建部署记录并返回 deploy_id；实际连接在 run_deployment_job 中执行。"""
    deploy_id = str(uuid.uuid4())
    now = _now()
    preview_data = preview(intent_id, topology_id, project_id)
    dep = {
        "id": deploy_id,
        "intentId": intent_id,
        "compileArtifactId": intent_id,
        "topologyId": topology_id,
        "projectId": project_id,
        "status": "deploying",
        "progress": 0,
        "sshConnections": [],
        "previewConfig": preview_data["configs"],
        "createdAt": now,
        "completedAt": None,
        "dryRun": dry_run,
    }
    _store[deploy_id] = dep
    _logs[deploy_id] = [
        {
            "timestamp": now,
            "level": "info",
            "message": "部署任务已创建，正在按拓扑节点建立 SSH 连接…",
            "nodeId": None,
        }
    ]
    dep["logs"] = _logs[deploy_id]
    return deploy_id


async def run_deployment_job(
    deploy_id: str,
    intent_id: str,
    topology_id: str,
    project_id: str | None,
    dry_run: bool,
) -> None:
    from app.api.websocket import broadcast_deploy_progress_sync

    def push(payload: dict) -> None:
        broadcast_deploy_progress_sync(deploy_id, payload)

    try:
        if dry_run:
            _append_log(deploy_id, "info", "干跑模式：跳过 SSH 实连", None)
            _set_dep_fields(deploy_id, status="completed", progress=100, completedAt=_now())
            push(
                {
                    "type": "deploymentProgress",
                    "deploymentId": deploy_id,
                    "status": "completed",
                    "progress": 100,
                    "sshConnections": _store.get(deploy_id, {}).get("sshConnections", []),
                }
            )
            return

        topo = topology_service.get_topology(topology_id)
        nodes = (topo or {}).get("nodes") or []

        if not nodes:
            _append_log(deploy_id, "warning", "拓扑中无设备节点，跳过 SSH", None)
            _set_dep_fields(deploy_id, status="completed", progress=100, completedAt=_now())
            push(
                {
                    "type": "deploymentProgress",
                    "deploymentId": deploy_id,
                    "status": "completed",
                    "progress": 100,
                    "sshConnections": [],
                }
            )
            return

        total = len(nodes)
        for i, node in enumerate(nodes):
            dep = _store.get(deploy_id)
            if dep and dep.get("status") == "cancelled":
                _append_log(deploy_id, "warning", "部署已取消", None)
                push({"type": "deploymentProgress", "deploymentId": deploy_id, "status": "cancelled"})
                return

            cfg = node.get("config") or {}
            host = (cfg.get("sshHost") or "").strip()
            port = int(cfg.get("sshPort") or 22)
            user = (cfg.get("sshUsername") or "").strip()
            password = str(cfg.get("sshPassword") or "")

            entry: dict[str, Any] = {
                "nodeId": node.get("id", ""),
                "name": node.get("name", ""),
                "host": host,
                "port": port,
                "status": "pending",
                "message": "",
            }

            if not host or not user:
                entry["status"] = "skipped"
                entry["message"] = "未配置 SSH 主机或用户名"
            else:
                ok, msg = await asyncio.to_thread(_try_ssh_connection, host, port, user, password)
                entry["status"] = "connected" if ok else "failed"
                entry["message"] = msg

            _append_ssh(deploy_id, entry)
            _append_log(
                deploy_id,
                "info" if entry["status"] in ("connected", "skipped") else "error",
                f"设备 {entry['name']} ({host or '-'}:{port}) — {entry['status']}: {entry['message']}",
                node.get("id"),
            )

            progress = int((i + 1) / total * 100)
            _set_dep_fields(deploy_id, progress=progress)

            push(
                {
                    "type": "deploymentProgress",
                    "deploymentId": deploy_id,
                    "status": "deploying",
                    "progress": progress,
                    "sshStatus": entry,
                    "sshConnections": _store.get(deploy_id, {}).get("sshConnections", []),
                }
            )

        _set_dep_fields(deploy_id, status="completed", progress=100, completedAt=_now())
        _append_log(deploy_id, "info", "所有节点 SSH 探测完成，部署阶段结束", None)
        push(
            {
                "type": "deploymentProgress",
                "deploymentId": deploy_id,
                "status": "completed",
                "progress": 100,
                "sshConnections": _store.get(deploy_id, {}).get("sshConnections", []),
            }
        )
    except Exception as exc:
        _append_log(deploy_id, "error", f"部署过程异常: {exc}", None)
        _set_dep_fields(deploy_id, status="failed", completedAt=_now())
        push(
            {
                "type": "deploymentProgress",
                "deploymentId": deploy_id,
                "status": "failed",
                "message": str(exc)[:200],
                "sshConnections": _store.get(deploy_id, {}).get("sshConnections", []),
            }
        )


def get_logs(id: str) -> list[dict]:
    return _logs.get(id, [])


def rollback(id: str) -> dict | None:
    if id not in _store:
        return None
    dep = _store[id]
    dep["status"] = "rolled_back"
    dep["completedAt"] = _now()
    return dep


def cancel(id: str) -> None:
    if id in _store:
        _store[id]["status"] = "cancelled"
        _store[id]["completedAt"] = _now()


def validate(intent_id: str, topology_id: str, project_id: str | None = None) -> dict:
    return {"valid": True, "message": "校验通过"}


def preview(intent_id: str, topology_id: str, project_id: str | None = None) -> dict:
    intent = intent_service.get_intent(intent_id)
    if intent and intent.get("compiledConfig"):
        return {"configs": intent["compiledConfig"]}

    compile_result = intent_service.compile_preview(
        content=intent.get("content", "") if intent else "",
        topology_id=topology_id,
        project_id=project_id,
    )
    return {"configs": compile_result.get("config", {"ip": {}, "ndn": {}, "geo": {}, "p4": {}})}
