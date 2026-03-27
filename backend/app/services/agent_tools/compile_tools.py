"""Compile / deploy related agent tools."""

from __future__ import annotations

import json
from typing import Any

from app.services.agent_tools import register_tool
from app.services import intent_service

# ---------------------------------------------------------------------------
# Tool: generate_dsl
# ---------------------------------------------------------------------------

_GENERATE_DSL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "generate_dsl",
        "description": "使用 LLM 将自然语言描述生成 PNE DSL 代码。返回生成的 DSL 和编译验证结果。",
        "parameters": {
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": "自然语言描述的网络意图",
                },
                "topology_id": {
                    "type": "string",
                    "description": "拓扑 ID（可选，提供后生成更精确的 DSL）",
                },
            },
            "required": ["input"],
        },
    },
}


def _generate_dsl(input: str, topology_id: str | None = None, **_kwargs: Any) -> dict[str, Any]:
    context = {}
    if topology_id:
        context["topologyId"] = topology_id
        context["skills"] = ["pne-dsl-grammar"]
    result = intent_service.translate_natural_language(input, context or None)
    return result


# ---------------------------------------------------------------------------
# Tool: compile_preview
# ---------------------------------------------------------------------------

_COMPILE_PREVIEW_SCHEMA = {
    "type": "function",
    "function": {
        "name": "compile_preview",
        "description": "编译预览 PNE DSL 代码（不保存）。返回编译结果、P4 代码、错误和警告。",
        "parameters": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "PNE DSL 源码",
                },
                "topology_id": {
                    "type": "string",
                    "description": "拓扑 ID（可选）",
                },
            },
            "required": ["content"],
        },
    },
}


def _compile_preview(content: str, topology_id: str | None = None, **_kwargs: Any) -> dict[str, Any]:
    result = intent_service.compile_preview({
        "content": content,
        **({"topologyId": topology_id} if topology_id else {}),
    })
    return result


# ---------------------------------------------------------------------------
# Tool: save_deploy_artifacts
# ---------------------------------------------------------------------------

_SAVE_DEPLOY_SCHEMA = {
    "type": "function",
    "function": {
        "name": "save_deploy_artifacts",
        "description": "编译 PNE DSL 并保存部署产物（P4、entries、manifest）到项目 output 目录。",
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "项目 ID"},
                "content": {"type": "string", "description": "PNE DSL 源码"},
                "topology_id": {"type": "string", "description": "拓扑 ID（可选）"},
            },
            "required": ["projectId", "content"],
        },
    },
}


def _save_deploy_artifacts(
    projectId: str,
    content: str,
    topology_id: str | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    result = intent_service.save_deploy_artifacts({
        "projectId": projectId,
        "content": content,
        **({"topologyId": topology_id} if topology_id else {}),
    })
    return result


# ---------------------------------------------------------------------------
# Register all
# ---------------------------------------------------------------------------

register_tool("generate_dsl", _GENERATE_DSL_SCHEMA, _generate_dsl)
register_tool("compile_preview", _COMPILE_PREVIEW_SCHEMA, _compile_preview)
register_tool("save_deploy_artifacts", _SAVE_DEPLOY_SCHEMA, _save_deploy_artifacts)
