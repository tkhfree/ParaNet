"""Agent orchestrator -- wired to AgentController from paranet.agent."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable

from paranet.agent.agenthub.paranet_agent.agent import ParaNetAgent
from paranet.agent.agenthub.paranet_agent.config import ParaNetAgentConfig
from paranet.agent.core.controller.agent_controller import AgentController
from paranet.agent.core.events.stream import EventStream, EventStreamSubscriber
from paranet.agent.core.runtime.factory import RuntimeFactory
from paranet.agent.core.loop_protection import StuckDetector, CancelFlag
from paranet.agent.core.persistence import LocalFileStore, PersistedEventStream, SessionStore

import config

logger = logging.getLogger(__name__)


def _build_context_message(
    topology_id: str | None, project_id: str | None
) -> str:
    """Build a context string from topology/project IDs for the agent."""
    parts: list[str] = []
    if project_id:
        parts.append(f"Project ID: {project_id}")
    if topology_id:
        parts.append(f"Current Topology ID: {topology_id}")
        try:
            from backend.app.services import topology_service

            topo = topology_service.get_topology(topology_id)
            if topo:
                nodes = topo.get("nodes", [])
                links = topo.get("links", [])
                parts.append(f"Topology name: {topo.get('name', 'unknown')}")
                parts.append(f"Node count: {len(nodes)}")
                if nodes:
                    for n in nodes:
                        parts.append(
                            f"  - {n.get('name', n.get('id'))} ({n.get('type', 'unknown')})"
                        )
                parts.append(f"Link count: {len(links)}")
        except Exception:
            parts.append("Topology detail fetch failed")
    if not parts:
        parts.append("No project or topology context")
    return "\n".join(parts)


def run_agent_chat(
    user_message: str,
    *,
    topology_id: str | None = None,
    project_id: str | None = None,
    conversation_history: list[dict[str, str]] | None = None,
    on_step: Callable[[dict[str, Any]], None] | None = None,
    session_id: str | None = None,
    cancel_flag: CancelFlag | None = None,
) -> dict[str, Any]:
    """Run the agent via AgentController.

    Creates a ParaNetAgent + Runtime + EventStream + AgentController,
    executes the agent loop, and returns the result.

    Returns:
        {
            "content": str,       # Final response text
            "steps": list[dict],  # All steps from the agent loop
            "actions": list[dict],# Suggested frontend actions
        }
    """
    # 1. Build ParaNetAgentConfig
    agent_config = ParaNetAgentConfig(
        model=config.LLM_MODEL,
        api_key=config.LLM_API_KEY,
        api_base=config.LLM_API_BASE,
        max_iterations=config.AGENT_MAX_ITERATIONS,
    )

    # 2. Create ParaNetAgent
    agent = ParaNetAgent(agent_config)

    # 3. Create Runtime via RuntimeFactory
    runtime = RuntimeFactory.create(
        force=os.getenv("PARANET_RUNTIME", "local"),
    )

    max_iterations = config.AGENT_MAX_ITERATIONS

    # 4. Create EventStream, subscribe SSE_BRIDGE if on_step callback provided
    event_stream = EventStream()
    if on_step is not None:
        event_stream.subscribe(
            EventStreamSubscriber.SSE_BRIDGE,
            on_step,
        )

    # 4.5 Set up persistence and loop protection
    session_store: SessionStore | None = None
    if session_id:
        from pathlib import Path
        data_dir = Path(config.DATA_DIR) / "agent_sessions"
        file_store = LocalFileStore(data_dir)
        session_store = SessionStore(file_store)
        event_stream = PersistedEventStream(session_id, file_store, event_stream)

    stuck_detector = StuckDetector()
    effective_cancel = cancel_flag or CancelFlag()

    # 5. Create AgentController
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=event_stream,
        max_iterations=max_iterations,
        session_store=session_store,
        stuck_detector=stuck_detector,
        cancel_flag=effective_cancel,
    )
    if session_id:
        controller.state.session_id = session_id

    # 6. If conversation_history provided, set it on controller.state.history
    if conversation_history:
        for msg in conversation_history:
            controller.state.history.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # 7. Build full_message with topology_id/project_id context
    context = _build_context_message(topology_id, project_id)
    full_message = user_message
    if context and context != "No project or topology context":
        full_message = f"[Context]\n{context}\n\n[User Message]\n{user_message}"

    # 8. Run the agent loop
    try:
        steps = controller.run_loop(full_message)
    except Exception as exc:
        logger.exception("AgentController.run_loop failed")
        controller.close()
        return {
            "content": f"Agent execution failed: {exc}",
            "steps": [],
            "actions": [],
        }

    # 9. Extract content and actions from steps
    content = ""
    actions: list[dict[str, Any]] = []
    formatted_steps: list[dict[str, Any]] = []

    for step in steps:
        formatted_steps.append(step)
        if not isinstance(step, dict):
            continue

        action_name = step.get("action", "")
        result = step.get("result")
        outputs = step.get("outputs")

        # Extract content from AgentFinishAction
        if action_name == "AgentFinishAction" and isinstance(result, dict):
            content = (
                result.get("message")
                or result.get("content")
                or ""
            )
        # Also try outputs.content for other step formats
        elif isinstance(outputs, dict) and "content" in outputs:
            content = outputs["content"]

    # Fallback: use last step's observation or result.content
    if not content and formatted_steps:
        last = formatted_steps[-1]
        if isinstance(last, dict):
            content = last.get("observation", "")
            if not content:
                r = last.get("result")
                if isinstance(r, dict):
                    content = r.get("content", r.get("message", ""))

    if not isinstance(content, str) or not content:
        content = "Agent completed execution."

    # 10. Detect frontend actions from steps
    _detect_actions_from_steps(formatted_steps, actions)

    controller.close()

    return {
        "content": content,
        "steps": formatted_steps,
        "actions": actions,
    }


def _detect_actions_from_steps(
    steps: list[dict[str, Any]], actions: list[dict[str, Any]]
) -> None:
    """Detect actions that the frontend should perform based on agent steps."""
    for step in steps:
        action_name = step.get("action", "")
        observation = step.get("observation", "")

        if action_name in ("FileWriteAction", "FileEditAction"):
            if not any(a["type"] == "refresh_files" for a in actions):
                actions.append({"type": "refresh_files"})

        if action_name == "TopologyAction":
            if not any(a["type"] == "refresh_topology" for a in actions):
                actions.append({"type": "refresh_topology"})

        if action_name == "DSLGenerateAction" and observation:
            actions.append({
                "type": "apply_dsl",
                "payload": {"dslCode": observation},
            })
