from datetime import datetime, timezone
from typing import Any
import uuid

_alerts: dict[str, dict[str, Any]] = {}
_alert_rules: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_health() -> dict:
    return {
        "status": "healthy",
        "nodesOnline": 0,
        "nodesTotal": 0,
        "linksActive": 0,
        "linksTotal": 0,
        "alerts": [],
    }


def get_node_metrics(node_ids: list | None = None, start_time: int | None = None, end_time: int | None = None, interval: int | None = None) -> list:
    return []


def get_link_metrics(link_ids: list | None = None, start_time: int | None = None, end_time: int | None = None, interval: int | None = None) -> list:
    return []


def get_alerts(acknowledged: bool | None = None, level: str | None = None) -> list:
    records = list(_alerts.values())
    if acknowledged is not None:
        records = [r for r in records if r.get("acknowledged") == acknowledged]
    if level:
        records = [r for r in records if r.get("level") == level]
    return records


def acknowledge_alert(id: str) -> bool:
    if id in _alerts:
        _alerts[id]["acknowledged"] = True
        return True
    return False


def get_alert_rules() -> list:
    return list(_alert_rules.values())


def create_alert_rule(name: str, enabled: bool, type_: str, threshold: float, duration: int, actions: list) -> dict:
    rule_id = str(uuid.uuid4())
    now = _now()
    rule = {
        "id": rule_id,
        "name": name,
        "enabled": enabled,
        "type": type_,
        "threshold": threshold,
        "duration": duration,
        "actions": actions or [],
    }
    _alert_rules[rule_id] = rule
    return rule


def update_alert_rule(id: str, **kwargs: Any) -> dict | None:
    if id not in _alert_rules:
        return None
    rule = _alert_rules[id]
    for k, v in kwargs.items():
        if v is not None:
            rule[k] = v
    return rule


def delete_alert_rule(id: str) -> bool:
    if id in _alert_rules:
        del _alert_rules[id]
        return True
    return False


def get_terminal_logs(node_id: str | None = None, lines: int = 100) -> str:
    return ""
