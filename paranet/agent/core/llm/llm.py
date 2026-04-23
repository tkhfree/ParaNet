"""LLM wrapper using litellm for unified model access."""
from __future__ import annotations

from typing import Any

import litellm
from litellm import completion as litellm_completion

from paranet.agent.core.llm.metrics import Metrics


class LLM:
    def __init__(
        self,
        model: str = "gpt-4o-mini",
        api_key: str | None = None,
        api_base: str | None = None,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ):
        self.model = model
        self.api_key = api_key
        self.api_base = api_base
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.metrics = Metrics()

    def completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> Any:
        params: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        if self.api_key:
            params["api_key"] = self.api_key
        if self.api_base:
            params["api_base"] = self.api_base
        if tools:
            params["tools"] = tools
        params.update(kwargs)

        response = litellm_completion(**params)

        if hasattr(response, "usage") and response.usage:
            self.metrics.add(
                prompt_tokens=getattr(response.usage, "prompt_tokens", 0) or 0,
                completion_tokens=getattr(response.usage, "completion_tokens", 0) or 0,
            )
        return response
