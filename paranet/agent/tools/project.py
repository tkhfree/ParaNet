from __future__ import annotations

import json
from typing import Any

from paranet.agent.core.events.action import ProjectAction
from paranet.agent.core.events.observation import Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import editor_project_service
    return editor_project_service


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, (dict, list)) else str(data)


class ProjectToolHandler:
    def handle(self, action: ProjectAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}
        project_id = (action.project_id or "").strip()

        try:
            if op == "list":
                return self._list()
            elif op == "get":
                return self._get(project_id)
            elif op == "create":
                return self._create(params)
            elif op == "update":
                return self._update(project_id, params)
            elif op == "delete":
                return self._delete(project_id)
            else:
                return Observation(content=f"Unknown project operation: {op}")
        except Exception as exc:
            return Observation(content=f"Project operation '{op}' failed: {exc}")

    def _list(self) -> Observation:
        svc = _get_service()
        projects = svc.list_projects()
        return Observation(content=_json(projects))

    def _get(self, project_id: str) -> Observation:
        if not project_id:
            return Observation(content="Error: project_id is required for 'get'.")
        svc = _get_service()
        project = svc.get_project(project_id)
        if not project:
            return Observation(content=f"Project {project_id} not found.")
        return Observation(content=_json(project))

    def _create(self, params: dict) -> Observation:
        svc = _get_service()
        name = params.get("name", "New Project")
        remark = params.get("remark")
        project = svc.create_project(name=name, remark=remark)
        return Observation(content=f"Project created:\n{_json(project)}")

    def _update(self, project_id: str, params: dict) -> Observation:
        if not project_id:
            return Observation(content="Error: project_id is required for 'update'.")
        svc = _get_service()
        result = svc.update_project(project_id, **params)
        if not result:
            return Observation(content=f"Project {project_id} not found.")
        return Observation(content=f"Project updated:\n{_json(result)}")

    def _delete(self, project_id: str) -> Observation:
        if not project_id:
            return Observation(content="Error: project_id is required for 'delete'.")
        svc = _get_service()
        if svc.delete_project(project_id):
            return Observation(content=f"Project {project_id} deleted.")
        return Observation(content=f"Project {project_id} not found.")
