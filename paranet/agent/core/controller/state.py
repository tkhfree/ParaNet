"""Agent execution state."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AgentState(str, Enum):
    RUNNING = "running"
    AWAITING_USER_INPUT = "awaiting_user_input"
    FINISHED = "finished"
    ERROR = "error"
    PAUSED = "paused"


@dataclass
class State:
    iteration: int = 0
    max_iterations: int = 30
    agent_state: AgentState = AgentState.RUNNING
    history: list[dict[str, Any]] = field(default_factory=list)
    extra_data: dict[str, Any] = field(default_factory=dict)
