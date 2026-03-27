"""Agent tool registry – register, list schemas, execute."""

from __future__ import annotations

import json
import traceback
from typing import Any, Callable

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ToolExecutor = Callable[..., dict[str, Any]]

# ---------------------------------------------------------------------------
# Internal state
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def register_tool(name: str, schema: dict[str, Any], executor: ToolExecutor) -> None:
    _REGISTRY[name] = {"schema": schema, "executor": executor}


def get_tool_schemas() -> list[dict[str, Any]]:
    return [entry["schema"] for entry in _REGISTRY.values()]


def execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    entry = _REGISTRY.get(name)
    if entry is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        result = entry["executor"](**arguments)
        return result if isinstance(result, dict) else {"result": result}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Tool '{name}' execution failed: {exc}", "traceback": traceback.format_exc()}


def tool_names() -> list[str]:
    return list(_REGISTRY.keys())


# ---------------------------------------------------------------------------
# Import sub-modules so they self-register on import
# ---------------------------------------------------------------------------

from app.services.agent_tools import topology_tools as _topo  # noqa: E402
from app.services.agent_tools import file_tools as _file  # noqa: E402
from app.services.agent_tools import compile_tools as _comp  # noqa: E402
from app.services.agent_tools import pne_templates as _pne  # noqa: E402
