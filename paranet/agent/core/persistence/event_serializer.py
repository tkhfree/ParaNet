"""Serialize / deserialize Action and Observation events to JSON."""
from __future__ import annotations

import json
from dataclasses import asdict, fields
from typing import Any

from paranet.agent.core.events.action import (
    Action,
    CmdRunAction, IPythonRunCellAction,
    FileReadAction, FileWriteAction, FileEditAction, FileOpAction,
    BrowseURLAction,
    AgentFinishAction, AgentDelegateAction, UserMessageAction,
    DSLGenerateAction, CompilePreviewAction, SaveArtifactsAction, TemplateCreateAction,
    TopologyAction, DBQueryAction,
    ProjectAction, DeployAction, MonitorAction,
    IntentAction, DeviceLegendAction,
)
from paranet.agent.core.events.observation import (
    Observation,
    CmdOutputObservation,
    FileReadObservation, FileWriteObservation, FileEditObservation,
    ErrorObservation,
    BrowserOutputObservation,
    DSLGenerateObservation, CompileResultObservation,
    TopologyObservation, DBQueryObservation,
    DeployObservation, MonitorObservation,
)

_ACTION_REGISTRY: dict[str, type[Action]] = {
    "CmdRunAction": CmdRunAction,
    "IPythonRunCellAction": IPythonRunCellAction,
    "FileReadAction": FileReadAction,
    "FileWriteAction": FileWriteAction,
    "FileEditAction": FileEditAction,
    "FileOpAction": FileOpAction,
    "BrowseURLAction": BrowseURLAction,
    "AgentFinishAction": AgentFinishAction,
    "AgentDelegateAction": AgentDelegateAction,
    "UserMessageAction": UserMessageAction,
    "DSLGenerateAction": DSLGenerateAction,
    "CompilePreviewAction": CompilePreviewAction,
    "SaveArtifactsAction": SaveArtifactsAction,
    "TemplateCreateAction": TemplateCreateAction,
    "TopologyAction": TopologyAction,
    "DBQueryAction": DBQueryAction,
    "ProjectAction": ProjectAction,
    "DeployAction": DeployAction,
    "MonitorAction": MonitorAction,
    "IntentAction": IntentAction,
    "DeviceLegendAction": DeviceLegendAction,
}

_OBSERVATION_REGISTRY: dict[str, type[Observation]] = {
    "CmdOutputObservation": CmdOutputObservation,
    "FileReadObservation": FileReadObservation,
    "FileWriteObservation": FileWriteObservation,
    "FileEditObservation": FileEditObservation,
    "ErrorObservation": ErrorObservation,
    "BrowserOutputObservation": BrowserOutputObservation,
    "DSLGenerateObservation": DSLGenerateObservation,
    "CompileResultObservation": CompileResultObservation,
    "TopologyObservation": TopologyObservation,
    "DBQueryObservation": DBQueryObservation,
    "DeployObservation": DeployObservation,
    "MonitorObservation": MonitorObservation,
}


def serialize(event: Action | Observation) -> str:
    """Event -> JSON string."""
    d: dict[str, Any] = asdict(event)
    d["__type__"] = type(event).__name__
    d["__category__"] = "action" if isinstance(event, Action) else "observation"
    d["_id"] = event.id
    d["_timestamp"] = event.timestamp
    d["_source"] = event.source.value
    d["_cause"] = event.cause
    return json.dumps(d, ensure_ascii=False, default=str)


def deserialize(data: str) -> Action | Observation:
    """JSON string -> Event."""
    d = json.loads(data)
    type_name = d.pop("__type__")
    category = d.pop("__category__")
    d.pop("_id", None)
    d.pop("_timestamp", None)
    d.pop("_source", None)
    d.pop("_cause", None)
    registry = _ACTION_REGISTRY if category == "action" else _OBSERVATION_REGISTRY
    cls = registry.get(type_name)
    if cls is None:
        raise ValueError(f"Unknown event type: {type_name}")
    accepted = {f.name for f in fields(cls) if f.init}
    filtered = {k: v for k, v in d.items() if k in accepted}
    return cls(**filtered)
