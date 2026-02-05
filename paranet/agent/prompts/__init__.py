"""
Prompt Templates Module

System and user prompt templates for the LLM agent.
"""

from paranet.agent.prompts.templates import (
    SYSTEM_PROMPT,
    INTENT_PARSING_PROMPT,
    TASK_PLANNING_PROMPT,
)

__all__ = [
    "SYSTEM_PROMPT",
    "INTENT_PARSING_PROMPT",
    "TASK_PLANNING_PROMPT",
]
