"""
Prompt Templates

Pre-defined prompts for LLM interactions.
"""

from __future__ import annotations

from paranet.agent.prompts.skill_loader import build_skill_context


SYSTEM_PROMPT = """You are ParaNet, an intelligent network programming assistant.

You help users configure and manage multi-modal network infrastructure including:
- IP networks (routing, ACLs, QoS)
- NDN (Named Data Networking) with content forwarding and caching
- GEO routing based on geographic coordinates
- P4 programmable switches

You can:
1. Parse natural language network requirements into structured intents
2. Plan multi-step network configuration tasks
3. Compile intents to protocol-specific configurations
4. Deploy configurations to network devices
5. Monitor network state and performance

Always be precise about network topology, addressing, and protocol semantics.
When uncertain, ask for clarification rather than making assumptions.
"""

INTENT_PARSING_PROMPT = """Analyze the following network configuration request and extract:
1. Intent type (routing, forwarding, policy, qos, security)
2. Source/destination entities (nodes, prefixes, regions)
3. Constraints (bandwidth, latency, reliability)
4. Protocol hints (IP, NDN, GEO, P4)

User request: {user_input}

Respond in JSON format:
{{
    "intent_type": "...",
    "entities": [...],
    "constraints": {{...}},
    "protocol_hints": [...]
}}
"""

TASK_PLANNING_PROMPT = """Given the following network intent, generate an execution plan.

Intent: {intent_json}

Available tools:
{available_tools}

Current network state:
{network_state}

Generate a step-by-step plan with:
1. Task name and description
2. Tool to use
3. Parameters
4. Dependencies on other tasks

Respond in JSON format:
{{
    "plan_id": "...",
    "tasks": [
        {{
            "task_id": "...",
            "name": "...",
            "tool": "...",
            "parameters": {{...}},
            "dependencies": [...]
        }}
    ]
}}
"""

DSL_GENERATION_PROMPT = """Translate the user request into valid ParaNet PNE DSL.

Use the injected skill context as the grammar source of truth.
Prefer exact topology IDs from the provided context.
If required details are missing, describe the gap instead of inventing topology facts.

Topology context:
{topology_context}

Active skill context:
{skill_context}

User request:
{user_input}
"""


def build_dsl_generation_prompt(
    user_input: str,
    topology_context: str = "",
    skill_names: list[str] | None = None,
) -> tuple[list[str], str]:
    """
    Build the DSL-generation prompt with automatically injected skill context.
    """
    resolved_skill_names, skill_context = build_skill_context(skill_names)
    prompt = DSL_GENERATION_PROMPT.format(
        user_input=user_input.strip(),
        topology_context=topology_context.strip() or "No topology context provided.",
        skill_context=skill_context or "No skill context provided.",
    )
    return resolved_skill_names, prompt
