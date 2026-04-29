# paranet/agent/core/controller/agent_controller.py
"""AgentController — orchestrates agent loop with runtime and event stream."""
from __future__ import annotations

import logging
from typing import Any

from paranet.agent.core.controller.agent import Agent
from paranet.agent.core.controller.state import AgentState, State
from paranet.agent.core.events.event import EventSource
from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.events.action import (
    Action, CmdRunAction, IPythonRunCellAction, AgentFinishAction,
    FileReadAction, FileWriteAction, FileEditAction, FileOpAction,
    BrowseURLAction,
    DSLGenerateAction, CompilePreviewAction, SaveArtifactsAction, TemplateCreateAction,
    TopologyAction, DBQueryAction,
    ProjectAction, DeployAction, MonitorAction,
    IntentAction, DeviceLegendAction,
)
from paranet.agent.core.events.observation import Observation, CmdOutputObservation
from paranet.agent.core.runtime.base import Runtime
from paranet.agent.core.loop_protection import StuckDetector, CancelFlag, IterationControlFlag
from paranet.agent.core.persistence.session_store import SessionStore
from paranet.agent.tools.code_exec import CodeExecToolHandler
from paranet.agent.tools.dsl import DSLToolHandler
from paranet.agent.tools.topology import TopologyToolHandler
from paranet.agent.tools.db import DBToolHandler
from paranet.agent.tools.file import FileToolHandler
from paranet.agent.tools.project import ProjectToolHandler
from paranet.agent.tools.deploy import DeployToolHandler
from paranet.agent.tools.monitor import MonitorToolHandler
from paranet.agent.tools.web import WebToolHandler
from paranet.agent.tools.device_legend import DeviceLegendToolHandler

logger = logging.getLogger(__name__)


class AgentController:
    def __init__(
        self,
        agent: Agent,
        runtime: Runtime,
        event_stream: EventStream,
        max_iterations: int = 30,
        session_store: SessionStore | None = None,
        stuck_detector: StuckDetector | None = None,
        cancel_flag: CancelFlag | None = None,
    ):
        self.agent = agent
        self.runtime = runtime
        self.event_stream = event_stream
        self.max_iterations = max_iterations
        self.state = State(max_iterations=max_iterations)
        self._session_store = session_store
        self._stuck_detector = stuck_detector or StuckDetector()
        self._cancel_flag = cancel_flag or CancelFlag()
        self._iteration_control = IterationControlFlag(max_iterations=max_iterations)

    def step(self) -> Action | None:
        if self._cancel_flag.is_cancelled:
            logger.info("Agent cancelled by user")
            self.state.agent_state = AgentState.FINISHED
            return None

        if self._iteration_control.is_exceeded:
            logger.warning("Max iterations reached")
            self.state.agent_state = AgentState.FINISHED
            return None

        self._iteration_control.increment()
        self.state.iteration = self._iteration_control.iteration
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
        elif isinstance(action, IPythonRunCellAction):
            obs = CodeExecToolHandler(self.runtime).handle_python(action)
        elif isinstance(action, FileReadAction):
            obs = FileToolHandler().handle_read(action)
        elif isinstance(action, FileWriteAction):
            obs = FileToolHandler().handle_write(action)
        elif isinstance(action, FileEditAction):
            obs = FileToolHandler().handle_edit(action)
        elif isinstance(action, BrowseURLAction):
            obs = WebToolHandler().handle_browse(action)
        elif isinstance(action, DSLGenerateAction):
            obs = DSLToolHandler().handle_generate(action)
        elif isinstance(action, CompilePreviewAction):
            obs = DSLToolHandler().handle_compile(action)
        elif isinstance(action, SaveArtifactsAction):
            obs = DSLToolHandler().handle_save(action)
        elif isinstance(action, TemplateCreateAction):
            obs = DSLToolHandler().handle_template(action)
        elif isinstance(action, TopologyAction):
            obs = TopologyToolHandler().handle(action)
        elif isinstance(action, DBQueryAction):
            obs = DBToolHandler().handle_query(action)
        elif isinstance(action, ProjectAction):
            obs = ProjectToolHandler().handle(action)
        elif isinstance(action, DeployAction):
            obs = DeployToolHandler().handle(action)
        elif isinstance(action, MonitorAction):
            obs = MonitorToolHandler().handle(action)
        elif isinstance(action, FileOpAction):
            obs = FileToolHandler().handle_op(action)
        elif isinstance(action, IntentAction):
            obs = DSLToolHandler().handle_intent(action)
        elif isinstance(action, DeviceLegendAction):
            obs = DeviceLegendToolHandler().handle(action)
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

            # Check stuck detector
            if obs is not None:
                result = self._stuck_detector.check(action, obs)
                if result.is_stuck:
                    logger.warning("Stuck detected: %s — %s", result.pattern, result.details)
                    self.state.agent_state = AgentState.ERROR
                    step_info["observation"] = obs.content
                    step_info["stuck"] = True
                    step_info["stuck_pattern"] = result.pattern.value
                    step_info["stuck_details"] = result.details
                    steps.append(step_info)
                    break

            step_info["observation"] = obs.content if obs else None
            steps.append(step_info)

        self._save_session_metadata()
        return steps

    def close(self):
        self.runtime.close()

    def _save_session_metadata(self) -> None:
        if self._session_store is None:
            return
        from paranet.agent.core.persistence.session_store import SessionMetadata
        final_status = "cancelled" if self._cancel_flag.is_cancelled else self.state.agent_state.value
        meta = SessionMetadata(
            session_id=self.state.session_id,
            status=final_status,
            agent_state=self.state.agent_state.value,
            iteration=self.state.iteration,
            max_iterations=self.max_iterations,
            event_count=self.state.iteration * 2,
        )
        self._session_store.save(meta)

    def restore_session(self, session_id: str, user_message: str) -> list[dict[str, Any]]:
        """Restore a previous session from persisted events and resume."""
        from paranet.agent.core.persistence.persisted_stream import PersistedEventStream
        if not isinstance(self.event_stream, PersistedEventStream):
            raise ValueError("restore_session requires PersistedEventStream")
        replayed = self.event_stream.replay_to_history()
        self.state.history = replayed
        self.state.session_id = session_id
        return self.run_loop(user_message)
