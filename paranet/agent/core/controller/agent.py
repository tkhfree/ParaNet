"""Abstract agent base class."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from paranet.agent.core.events.action import Action
from paranet.agent.core.controller.state import State


@dataclass
class AgentConfig:
    model: str = "gpt-4o-mini"
    api_key: str | None = None
    api_base: str | None = None
    max_iterations: int = 30
    enable_cmd: bool = True
    enable_ipython: bool = True
    enable_browse: bool = True
    enable_finish: bool = True
    temperature: float = 0.0


class Agent(ABC):
    def __init__(self, config: AgentConfig):
        self.config = config

    @abstractmethod
    def step(self, state: State) -> Action:
        ...

    @abstractmethod
    def reset(self) -> None:
        ...
