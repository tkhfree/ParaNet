from __future__ import annotations

import json
from typing import Any

from paranet.agent.core.events.action import DeviceLegendAction
from paranet.agent.core.events.observation import Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import device_legend_service
    return device_legend_service


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, (dict, list)) else str(data)


class DeviceLegendToolHandler:
    def handle(self, action: DeviceLegendAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}
        legend_id = (action.legend_id or "").strip()

        try:
            if op == "list":
                return self._list()
            elif op == "get":
                return self._get(legend_id)
            elif op == "create":
                return self._create(params)
            elif op == "update":
                return self._update(legend_id, params)
            elif op == "delete":
                return self._delete(legend_id)
            else:
                return Observation(content=f"Unknown device_legend operation: {op}")
        except Exception as exc:
            return Observation(content=f"Device legend operation '{op}' failed: {exc}")

    def _list(self) -> Observation:
        svc = _get_service()
        result = svc.list_device_legends()
        return Observation(content=_json(result))

    def _get(self, legend_id: str) -> Observation:
        if not legend_id:
            return Observation(content="Error: legend_id is required for 'get'.")
        svc = _get_service()
        result = svc.get_device_legend(legend_id)
        if not result:
            return Observation(content=f"Device legend {legend_id} not found.")
        return Observation(content=_json(result))

    def _create(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.create_device_legend(
            type=params.get("type", ""),
            label=params.get("label", ""),
            image_key=params.get("image_key"),
            color=params.get("color"),
            sort=params.get("sort"),
        )
        return Observation(content=f"Device legend created:\n{_json(result)}")

    def _update(self, legend_id: str, params: dict) -> Observation:
        if not legend_id:
            return Observation(content="Error: legend_id is required for 'update'.")
        svc = _get_service()
        updates = {k: v for k, v in params.items() if v is not None}
        result = svc.update_device_legend(legend_id, **updates)
        if not result:
            return Observation(content=f"Device legend {legend_id} not found.")
        return Observation(content=f"Device legend updated:\n{_json(result)}")

    def _delete(self, legend_id: str) -> Observation:
        if not legend_id:
            return Observation(content="Error: legend_id is required for 'delete'.")
        svc = _get_service()
        if svc.delete_device_legend(legend_id):
            return Observation(content=f"Device legend {legend_id} deleted.")
        return Observation(content=f"Device legend {legend_id} not found.")
