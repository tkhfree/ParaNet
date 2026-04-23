# paranet/agent/core/controller/agent_controller.py
"""AgentController — orchestrates agent loop with runtime and event stream."""
from __future__ import annotations

import logging
from typing import Any

from paranet.agent.core.controller.agent import Agent
from paranet.agent.core.controller.state import AgentState, State
from paranet.agent.core.events.event import EventSource
from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.events.action import Action, CmdRunAction, AgentFinishAction
from paranet.agent.core.events.action import FileReadAction, FileWriteAction, FileEditAction
from paranet.agent.core.events.observation import Observation, CmdOutputObservation
from paranet.agent.core.runtime.base import Runtime

logger = logging.getLogger(__name__)


class AgentController:
    def __init__(
        self,
        agent: Agent,
        runtime: Runtime,
        event_stream: EventStream,
        max_iterations: int = 30,
    ):
        self.agent = agent
        self.runtime = runtime
        self.event_stream = event_stream
        self.max_iterations = max_iterations
        self.state = State(max_iterations=max_iterations)

    def step(self) -> Action | None:
        if self.state.iteration >= self.max_iterations:
            logger.warning("Max iterations reached")
            self.state.agent_state = AgentState.FINISHED
            return None

        self.state.iteration += 1
        action = self.agent.step(self.state)
        self.event_stream.add_event(action, EventSource.AGENT)

        if isinstance(action, AgentFinishAction):
            self.state.agent_state = AgentState.FINISHED
            return action

        return action

    def execute_action(self, action: Action) -> Observation | None:
        if isinstance(action, AgentFinishAction):
            self.state.agent_state = AgentState.FINISHED
            return None

        if isinstance(action, CmdRunAction):
            obs = self.runtime.run(action)
        elif isinstance(action, FileReadAction):
            obs = self.runtime.read(action)
        elif isinstance(action, FileWriteAction):
            obs = self.runtime.write(action)
        elif isinstance(action, FileEditAction):
            obs = self.runtime.edit(action)
        else:
            obs = Observation(content=f"Action {type(action).__name__} executed (no handler)")

        if obs is not None:
            self.event_stream.add_event(obs, EventSource.ENVIRONMENT)
            self.state.history.append({
                "role": "tool",
                "content": obs.content,
                "tool_name": type(action).__name__,
            })

        return obs

    def run_loop(self, user_message: str) -> list[dict[str, Any]]:
        self.state.agent_state = AgentState.RUNNING
        self.state.history.append({"role": "user", "content": user_message})
        steps = []

        while self.state.agent_state == AgentState.RUNNING:
            action = self.step()
            if action is None:
                break

            step_info = {
                "action": type(action).__name__,
                "source": "agent",
            }

            if isinstance(action, AgentFinishAction):
                step_info["result"] = action.outputs
                steps.append(step_info)
                break

            obs = self.execute_action(action)
            step_info["observation"] = obs.content if obs else None
            steps.append(step_info)

        return steps

    def close(self):
        self.runtime.close()
