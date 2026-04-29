from __future__ import annotations
import json
from typing import Any

from paranet.agent.core.events.action import (
    Action,
    CmdRunAction,
    IPythonRunCellAction,
    FileReadAction,
    FileWriteAction,
    FileEditAction,
    FileOpAction,
    BrowseURLAction,
    AgentFinishAction,
    DSLGenerateAction,
    CompilePreviewAction,
    SaveArtifactsAction,
    TemplateCreateAction,
    TopologyAction,
    DBQueryAction,
    ProjectAction,
    DeployAction,
    MonitorAction,
    IntentAction,
    DeviceLegendAction,
)


def response_to_actions(response: Any) -> list[Action]:
    """Convert an LLM response into a list of Action objects."""
    actions: list[Action] = []
    choice = response.choices[0]
    message = choice.message

    if message.tool_calls:
        for tool_call in message.tool_calls:
            name = tool_call.function.name
            try:
                args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                args = {}
            action = _tool_call_to_action(name, args)
            actions.append(action)
    elif message.content:
        actions.append(AgentFinishAction(outputs={"content": message.content}))

    if not actions:
        actions.append(AgentFinishAction(outputs={"content": ""}))

    return actions


def _tool_call_to_action(name: str, args: dict[str, Any]) -> Action:
    """Map a tool call name and arguments to the appropriate Action subclass."""
    mapping: dict[str, type[Action]] = {
        "run_command": CmdRunAction,
        "run_python": IPythonRunCellAction,
        "read_file": FileReadAction,
        "write_file": FileWriteAction,
        "edit_file": FileEditAction,
        "browse_url": BrowseURLAction,
        "generate_dsl": DSLGenerateAction,
        "compile_preview": CompilePreviewAction,
        "save_artifacts": SaveArtifactsAction,
        "create_from_template": TemplateCreateAction,
        "topology_op": TopologyAction,
        "query_db": DBQueryAction,
        "project_op": ProjectAction,
        "deploy_op": DeployAction,
        "monitor_op": MonitorAction,
        "file_op": FileOpAction,
        "intent_op": IntentAction,
        "device_legend_op": DeviceLegendAction,
    }

    cls = mapping.get(name)
    if cls is None:
        if name == "finish":
            return AgentFinishAction(outputs={"content": args.get("message", "")})
        return AgentFinishAction(outputs={"error": f"Unknown tool: {name}"})

    field_map: dict[type[Action], dict[str, Any]] = {
        CmdRunAction: {"command": args.get("command", "")},
        IPythonRunCellAction: {"code": args.get("code", "")},
        FileReadAction: {"path": args.get("path", "")},
        FileWriteAction: {
            "path": args.get("path", ""),
            "content": args.get("content", ""),
        },
        FileEditAction: {
            "path": args.get("path", ""),
            "old_str": args.get("old_str", ""),
            "new_str": args.get("new_str", ""),
        },
        BrowseURLAction: {"url": args.get("url", "")},
        DSLGenerateAction: {
            "description": args.get("description", ""),
            "topology_context": args.get("topology_context", ""),
        },
        CompilePreviewAction: {"dsl_code": args.get("dsl_code", "")},
        SaveArtifactsAction: {
            "dsl_code": args.get("dsl_code", ""),
            "project_id": args.get("project_id", ""),
            "file_name": args.get("file_name", ""),
        },
        TemplateCreateAction: {
            "template_name": args.get("template_name", ""),
            "project_id": args.get("project_id", ""),
            "file_name": args.get("file_name", ""),
        },
        TopologyAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
            "topology_id": args.get("topology_id", ""),
        },
        DBQueryAction: {
            "query": args.get("query", ""),
            "params": args.get("params", {}),
        },
        ProjectAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
            "project_id": args.get("project_id", ""),
        },
        DeployAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
        },
        MonitorAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
        },
        FileOpAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
            "project_id": args.get("project_id", ""),
        },
        IntentAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
            "intent_id": args.get("intent_id", ""),
        },
        DeviceLegendAction: {
            "operation": args.get("operation", ""),
            "params": args.get("params", {}),
            "legend_id": args.get("legend_id", ""),
        },
    }
    return cls(**field_map.get(cls, {}))
