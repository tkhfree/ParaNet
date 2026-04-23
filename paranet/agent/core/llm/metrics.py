"""Token and cost tracking for LLM calls."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Metrics:
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_cost: float = 0.0

    def add(self, prompt_tokens: int = 0, completion_tokens: int = 0, cost: float = 0.0):
        self.total_prompt_tokens += prompt_tokens
        self.total_completion_tokens += completion_tokens
        self.total_cost += cost
