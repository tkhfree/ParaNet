from __future__ import annotations

import json
from typing import Any

from paranet.agent.core.events.action import DeployAction
from paranet.agent.core.events.observation import DeployObservation, Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import deploy_service
    return deploy_service


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, (dict, list)) else str(data)


class DeployToolHandler:
    def handle(self, action: DeployAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}

        try:
            if op == "prepare":
                return self._prepare(params)
            elif op == "list":
                return self._list(params)
            elif op == "status":
                return self._status(params)
            elif op == "logs":
                return self._logs(params)
            elif op == "rollback":
                return self._rollback(params)
            elif op == "cancel":
                return self._cancel(params)
            elif op == "validate":
                return self._validate(params)
            elif op == "preview":
                return self._preview(params)
            else:
                return Observation(content=f"Unknown deploy operation: {op}")
        except Exception as exc:
            return Observation(content=f"Deploy operation '{op}' failed: {exc}")

    def _prepare(self, params: dict) -> Observation:
        svc = _get_service()
        intent_id = params.get("intent_id", "")
        topology_id = params.get("topology_id", "")
        project_id = params.get("project_id")
        dry_run = params.get("dry_run", False)
        deploy_id = svc.prepare_deployment(intent_id, topology_id, project_id, dry_run)
        return DeployObservation(content=f"Deployment prepared: {deploy_id}", deploy_id=deploy_id, success=True)

    def _list(self, params: dict) -> Observation:
        svc = _get_service()
        project_id = params.get("project_id")
        result = svc.list_deployments(
            page_no=params.get("page_no", 1),
            page_size=params.get("page_size", 20),
            project_id=project_id,
        )
        return Observation(content=_json(result))

    def _status(self, params: dict) -> Observation:
        deploy_id = params.get("deploy_id", "")
        if not deploy_id:
            return Observation(content="Error: deploy_id is required.")
        svc = _get_service()
        result = svc.get_deployment(deploy_id)
        if not result:
            return Observation(content=f"Deployment {deploy_id} not found.")
        return Observation(content=_json(result))

    def _logs(self, params: dict) -> Observation:
        deploy_id = params.get("deploy_id", "")
        if not deploy_id:
            return Observation(content="Error: deploy_id is required.")
        svc = _get_service()
        logs = svc.get_logs(deploy_id)
        return Observation(content=_json(logs))

    def _rollback(self, params: dict) -> Observation:
        deploy_id = params.get("deploy_id", "")
        if not deploy_id:
            return Observation(content="Error: deploy_id is required.")
        svc = _get_service()
        result = svc.rollback(deploy_id)
        if not result:
            return Observation(content=f"Deployment {deploy_id} not found.")
        return Observation(content=f"Deployment rolled back:\n{_json(result)}")

    def _cancel(self, params: dict) -> Observation:
        deploy_id = params.get("deploy_id", "")
        if not deploy_id:
            return Observation(content="Error: deploy_id is required.")
        svc = _get_service()
        svc.cancel(deploy_id)
        return Observation(content=f"Deployment {deploy_id} cancelled.")

    def _validate(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.validate(
            intent_id=params.get("intent_id", ""),
            topology_id=params.get("topology_id", ""),
            project_id=params.get("project_id"),
        )
        return Observation(content=_json(result))

    def _preview(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.preview(
            intent_id=params.get("intent_id", ""),
            topology_id=params.get("topology_id", ""),
            project_id=params.get("project_id"),
        )
        return Observation(content=_json(result))
