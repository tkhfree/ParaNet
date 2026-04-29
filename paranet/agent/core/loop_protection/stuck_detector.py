"""Stuck detector — detects 4 loop patterns following OpenHands design."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from enum import Enum

from paranet.agent.core.events.action import Action, AgentFinishAction
from paranet.agent.core.events.observation import Observation, ErrorObservation


class StuckPattern(str, Enum):
    REPEATED_ACTION_OBS = "repeated_action_observation"
    REPEATED_ACTION_ERROR = "repeated_action_error"
    MONOLOGUE = "monologue"
    ALTERNATING = "alternating_pattern"


@dataclass
class StuckDetectorResult:
    is_stuck: bool = False
    pattern: StuckPattern | None = None
    details: str = ""


class StuckDetector:
    """Detects 4 loop-stuck patterns from recent action/observation pairs."""

    def __init__(
        self,
        repeated_action_obs_threshold: int = 4,
        repeated_action_error_threshold: int = 3,
        monologue_threshold: int = 3,
        alternating_window: int = 6,
    ):
        self._obs_threshold = repeated_action_obs_threshold
        self._error_threshold = repeated_action_error_threshold
        self._monologue_threshold = monologue_threshold
        self._alternating_window = alternating_window
        self._pairs: deque[tuple[str, str]] = deque(maxlen=50)
        self._consecutive_obs: int = 0
        self._last_action_key: str = ""
        self._last_obs_key: str = ""
        self._consecutive_error: int = 0
        self._last_error_key: str = ""
        self._monologue_contents: deque[str] = deque(maxlen=monologue_threshold)

    def check(self, action: Action, observation: Observation | None) -> StuckDetectorResult:
        action_key = self._action_key(action)
        obs_key = self._obs_key(observation)
        self._pairs.append((action_key, obs_key))

        # Pattern 1: repeated action+observation
        if action_key == self._last_action_key and obs_key == self._last_obs_key:
            self._consecutive_obs += 1
        else:
            self._consecutive_obs = 1
            self._last_action_key = action_key
            self._last_obs_key = obs_key
        if self._consecutive_obs >= self._obs_threshold:
            return StuckDetectorResult(
                is_stuck=True,
                pattern=StuckPattern.REPEATED_ACTION_OBS,
                details=f"Same action+observation repeated {self._consecutive_obs} times: {action_key}",
            )

        # Pattern 2: repeated action+error
        is_error = isinstance(observation, ErrorObservation)
        if is_error and action_key == self._last_error_key:
            self._consecutive_error += 1
        else:
            self._consecutive_error = 1 if is_error else 0
            self._last_error_key = action_key
        if self._consecutive_error >= self._error_threshold:
            return StuckDetectorResult(
                is_stuck=True,
                pattern=StuckPattern.REPEATED_ACTION_ERROR,
                details=f"Same action+error repeated {self._consecutive_error} times: {action_key}",
            )

        # Pattern 3: monologue (agent finishes with same content repeatedly)
        if isinstance(action, AgentFinishAction):
            content = str(action.outputs.get("content", ""))[:200]
            self._monologue_contents.append(content)
            if len(self._monologue_contents) >= self._monologue_threshold:
                if len(set(self._monologue_contents)) == 1:
                    return StuckDetectorResult(
                        is_stuck=True,
                        pattern=StuckPattern.MONOLOGUE,
                        details=f"Agent produced same finish content {self._monologue_threshold} times",
                    )

        # Pattern 4: alternating ABABAB
        if len(self._pairs) >= self._alternating_window:
            recent = list(self._pairs)[-self._alternating_window:]
            evens = [recent[i] for i in range(0, len(recent), 2)]
            odds = [recent[i] for i in range(1, len(recent), 2)]
            if len(set(evens)) == 1 and len(set(odds)) == 1 and evens[0] != odds[0]:
                return StuckDetectorResult(
                    is_stuck=True,
                    pattern=StuckPattern.ALTERNATING,
                    details=f"Alternating pattern detected: {evens[0]} <-> {odds[0]}",
                )

        return StuckDetectorResult(is_stuck=False)

    def reset(self) -> None:
        self._pairs.clear()
        self._consecutive_obs = 0
        self._last_action_key = ""
        self._last_obs_key = ""
        self._consecutive_error = 0
        self._last_error_key = ""
        self._monologue_contents.clear()

    @staticmethod
    def _action_key(action: Action) -> str:
        return type(action).__name__

    @staticmethod
    def _obs_key(obs: Observation | None) -> str:
        if obs is None:
            return "None"
        preview = obs.content[:200] if obs.content else ""
        return f"{type(obs).__name__}:{preview}"
