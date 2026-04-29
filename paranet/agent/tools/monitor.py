from __future__ import annotations

import json
from typing import Any

from paranet.agent.core.events.action import MonitorAction
from paranet.agent.core.events.observation import MonitorObservation, Observation


def _get_service():
    import sys
    from pathlib import Path
    backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services import monitor_service
    return monitor_service


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, (dict, list)) else str(data)


class MonitorToolHandler:
    def handle(self, action: MonitorAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}

        try:
            if op == "health":
                return self._health()
            elif op == "node_metrics":
                return self._node_metrics(params)
            elif op == "link_metrics":
                return self._link_metrics(params)
            elif op == "alerts":
                return self._alerts(params)
            elif op == "acknowledge_alert":
                return self._acknowledge_alert(params)
            elif op == "alert_rules":
                return self._alert_rules(params)
            elif op == "create_alert_rule":
                return self._create_alert_rule(params)
            elif op == "update_alert_rule":
                return self._update_alert_rule(params)
            elif op == "delete_alert_rule":
                return self._delete_alert_rule(params)
            elif op == "terminal_logs":
                return self._terminal_logs(params)
            else:
                return Observation(content=f"Unknown monitor operation: {op}")
        except Exception as exc:
            return Observation(content=f"Monitor operation '{op}' failed: {exc}")

    def _health(self) -> Observation:
        svc = _get_service()
        result = svc.get_health()
        return MonitorObservation(content=_json(result), metric_type="health")

    def _node_metrics(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.get_node_metrics(
            node_ids=params.get("node_ids"),
            start_time=params.get("start_time"),
            end_time=params.get("end_time"),
            interval=params.get("interval"),
        )
        return MonitorObservation(content=_json(result), metric_type="node_metrics")

    def _link_metrics(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.get_link_metrics(
            link_ids=params.get("link_ids"),
            start_time=params.get("start_time"),
            end_time=params.get("end_time"),
            interval=params.get("interval"),
        )
        return MonitorObservation(content=_json(result), metric_type="link_metrics")

    def _alerts(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.get_alerts(
            acknowledged=params.get("acknowledged"),
            level=params.get("level"),
        )
        return MonitorObservation(content=_json(result), metric_type="alerts")

    def _alert_rules(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.get_alert_rules()
        return MonitorObservation(content=_json(result), metric_type="alert_rules")

    def _acknowledge_alert(self, params: dict) -> Observation:
        alert_id = params.get("alert_id") or params.get("id", "")
        if not alert_id:
            return Observation(content="Error: alert_id is required for 'acknowledge_alert'.")
        svc = _get_service()
        result = svc.acknowledge_alert(alert_id)
        return Observation(content=f"Alert {alert_id} acknowledged." if result else f"Alert {alert_id} not found.")

    def _create_alert_rule(self, params: dict) -> Observation:
        svc = _get_service()
        result = svc.create_alert_rule(
            name=params.get("name", ""),
            enabled=params.get("enabled", True),
            type_=params.get("type", ""),
            threshold=params.get("threshold"),
            duration=params.get("duration"),
            actions=params.get("actions"),
        )
        return MonitorObservation(content=f"Alert rule created:\n{_json(result)}", metric_type="alert_rule")

    def _update_alert_rule(self, params: dict) -> Observation:
        rule_id = params.get("rule_id") or params.get("id", "")
        if not rule_id:
            return Observation(content="Error: rule_id is required for 'update_alert_rule'.")
        svc = _get_service()
        updates = {k: v for k, v in params.items() if k not in ("rule_id", "id") and v is not None}
        if "type" in updates:
            updates["type_"] = updates.pop("type")
        result = svc.update_alert_rule(rule_id, **updates)
        return Observation(content=f"Alert rule {rule_id} updated:\n{_json(result)}" if result else f"Alert rule {rule_id} not found.")

    def _delete_alert_rule(self, params: dict) -> Observation:
        rule_id = params.get("rule_id") or params.get("id", "")
        if not rule_id:
            return Observation(content="Error: rule_id is required for 'delete_alert_rule'.")
        svc = _get_service()
        svc.delete_alert_rule(rule_id)
        return Observation(content=f"Alert rule {rule_id} deleted.")

    def _terminal_logs(self, params: dict) -> Observation:
        node_id = params.get("node_id", "")
        if not node_id:
            return Observation(content="Error: node_id is required for 'terminal_logs'.")
        svc = _get_service()
        result = svc.get_terminal_logs(node_id, lines=params.get("lines", 100))
        return MonitorObservation(content=_json(result) if isinstance(result, (dict, list)) else str(result), metric_type="terminal_logs")
