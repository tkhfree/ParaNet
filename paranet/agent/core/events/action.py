# paranet/agent/core/events/action.py
"""Action types for the agent event system."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from paranet.agent.core.events.event import Event


class ActionConfirmationStatus(str, Enum):
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    AWAITING_CONFIRMATION = "awaiting_confirmation"


@dataclass
class Action(Event):
    runnable: ClassVar[bool] = False
    confirmation_status: ActionConfirmationStatus = field(
        default=ActionConfirmationStatus.CONFIRMED, init=True
    )


@dataclass
class CmdRunAction(Action):
    runnable: ClassVar[bool] = True
    command: str = ""
    timeout: int = 120


@dataclass
class IPythonRunCellAction(Action):
    runnable: ClassVar[bool] = True
    code: str = ""


@dataclass
class FileReadAction(Action):
    runnable: ClassVar[bool] = True
    path: str = ""


@dataclass
class FileWriteAction(Action):
    runnable: ClassVar[bool] = True
    path: str = ""
    content: str = ""


@dataclass
class FileEditAction(Action):
    runnable: ClassVar[bool] = True
    path: str = ""
    old_str: str = ""
    new_str: str = ""


@dataclass
class BrowseURLAction(Action):
    runnable: ClassVar[bool] = True
    url: str = ""


@dataclass
class AgentFinishAction(Action):
    outputs: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentDelegateAction(Action):
    runnable: ClassVar[bool] = True
    task: str = ""


@dataclass
class DSLGenerateAction(Action):
    runnable: ClassVar[bool] = True
    description: str = ""
    topology_context: str = ""


@dataclass
class CompilePreviewAction(Action):
    runnable: ClassVar[bool] = True
    dsl_code: str = ""


@dataclass
class SaveArtifactsAction(Action):
    runnable: ClassVar[bool] = True
    dsl_code: str = ""
    project_id: str = ""
    file_name: str = ""


@dataclass
class TemplateCreateAction(Action):
    runnable: ClassVar[bool] = True
    template_name: str = ""
    project_id: str = ""
    file_name: str = ""


@dataclass
class TopologyAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    topology_id: str = ""


@dataclass
class DBQueryAction(Action):
    runnable: ClassVar[bool] = True
    query: str = ""
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    project_id: str = ""


@dataclass
class DeployAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class MonitorAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class FileOpAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    project_id: str = ""


@dataclass
class IntentAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    intent_id: str = ""


@dataclass
class DeviceLegendAction(Action):
    runnable: ClassVar[bool] = True
    operation: str = ""
    params: dict[str, Any] = field(default_factory=dict)
    legend_id: str = ""


@dataclass
class UserMessageAction(Action):
    content: str = ""
