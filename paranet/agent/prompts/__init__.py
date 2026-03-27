"""
Prompt Templates Module

System and user prompt templates for the LLM agent.
"""

from paranet.agent.prompts.templates import (
    DSL_GENERATION_PROMPT,
    SYSTEM_PROMPT,
    INTENT_PARSING_PROMPT,
    TASK_PLANNING_PROMPT,
    build_dsl_generation_prompt,
)
from paranet.agent.prompts.skill_loader import DEFAULT_AGENT_SKILLS, build_skill_context, resolve_skill_names

__all__ = [
    "DEFAULT_AGENT_SKILLS",
    "DSL_GENERATION_PROMPT",
    "SYSTEM_PROMPT",
    "INTENT_PARSING_PROMPT",
    "TASK_PLANNING_PROMPT",
    "build_dsl_generation_prompt",
    "build_skill_context",
    "resolve_skill_names",
]
