"""Resolve per-device P4 backend from topology node metadata (one-big-switch placement)."""

from __future__ import annotations

from typing import Any

# 与 compiler.backend.factory.get_backend_emitter 接受的名称对齐
_ALIASES: dict[str, str] = {
    "bmv2": "bmv2",
    "v1model": "bmv2",
    "simple_switch": "bmv2",
    "software_switch": "bmv2",
    "tofino": "tofino",
    "tna": "tofino",
    "barefoot": "tofino",
    "stub": "stub",
    "none": "stub",
    "off": "stub",
    "placeholder": "stub",
}


def normalize_data_plane_target(raw: str | None, default: str = "bmv2") -> str:
    if not raw or not str(raw).strip():
        return default
    key = str(raw).strip().lower()
    return _ALIASES.get(key, default)


def resolve_node_data_plane_target(node: dict[str, Any], default: str = "bmv2") -> str:
    """
    从拓扑节点读取数据面目标（BMv2 / Tofino / 占位）。

    优先级：
    1. ``capabilities.dataPlaneTarget``（或 ``capabilities.backend``）
    2. 顶层 ``dataPlaneTarget``
    3. ``default``
    """
    caps = node.get("capabilities")
    raw: Any = None
    if isinstance(caps, dict):
        raw = caps.get("dataPlaneTarget") or caps.get("backend")
    if raw is None:
        raw = node.get("dataPlaneTarget")
    if raw is not None and str(raw).strip():
        return normalize_data_plane_target(str(raw), default)
    return normalize_data_plane_target(None, default)


__all__ = ["normalize_data_plane_target", "resolve_node_data_plane_target"]
