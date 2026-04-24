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

logger = logging.getLogger(__name__)

# Max iterations for the agent loop (can be overridden via env var)
MAX_ITERATIONS = int(os.getenv("PARANET_AGENT_MAX_ITERATIONS", "8"))


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
    #    后端启动时 load_dotenv 已加载 .env → os.environ
    #    优先级: PARANET_LLM_* > ZHIPU_* > 硬编码默认值
    config = ParaNetAgentConfig(
        model=(
            os.getenv("PARANET_LLM_MODEL")
            or os.getenv("ZHIPU_MODEL")
            or "glm-4-flash"
        ),
        api_key=(
            os.getenv("PARANET_LLM_API_KEY")
            or os.getenv("ZHIPU_API_KEY")
            or ""
        ),
        api_base=(
            os.getenv("PARANET_LLM_API_BASE")
            or os.getenv("ZHIPU_BASE_URL")
            or "https://open.bigmodel.cn/api/paas/v4/"
        ),
        max_iterations=MAX_ITERATIONS,
    )

    # 2. Create ParaNetAgent
    agent = ParaNetAgent(config)

    # 3. Create Runtime via RuntimeFactory
    runtime = RuntimeFactory.create(
        force=os.getenv("PARANET_RUNTIME", "local"),
    )

    # 4. Create EventStream, subscribe SSE_BRIDGE if on_step callback provided
    event_stream = EventStream()
    if on_step is not None:
        event_stream.subscribe(
            EventStreamSubscriber.SSE_BRIDGE,
            on_step,
        )

    # 5. Create AgentController
    controller = AgentController(
        agent=agent,
        runtime=runtime,
        event_stream=event_stream,
        max_iterations=MAX_ITERATIONS,
    )

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
        action_name = step.get("action", "")

        # Extract final content from AgentFinishAction
        if action_name == "AgentFinishAction":
            result = step.get("result", {})
            if isinstance(result, dict):
                content = result.get("message", result.get("outputs", {}).get("message", ""))

    # If no AgentFinishAction produced content, use the last step's observation
    if not content and formatted_steps:
        last = formatted_steps[-1]
        content = last.get("observation", last.get("result", ""))

    # If still no content, provide a fallback
    if not content:
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
