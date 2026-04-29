"""Enhanced iteration tracking with dynamic limit increase."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IterationControlFlag:
    max_iterations: int = 30
    iteration: int = 0
    _dynamic_increase: int = 0

    def increment(self) -> None:
        self.iteration += 1

    @property
    def remaining(self) -> int:
        return self.effective_max - self.iteration

    @property
    def effective_max(self) -> int:
        return self.max_iterations + self._dynamic_increase

    @property
    def is_exceeded(self) -> bool:
        return self.iteration >= self.effective_max

    def increase_limit(self, extra: int = 5) -> None:
        self._dynamic_increase += extra

    def reset(self) -> None:
        self.iteration = 0
        self._dynamic_increase = 0
