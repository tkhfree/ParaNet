"""
LLM Interface Module

Abstract interface for LLM providers (Claude, OpenAI, local models).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


class LLMProvider(Enum):
    """Supported LLM providers."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    LOCAL = "local"


@dataclass
class LLMConfig:
    """Configuration for LLM connection."""
    provider: LLMProvider
    model: str
    api_key: str | None = None
    base_url: str | None = None
    temperature: float = 0.0
    max_tokens: int = 4096


@dataclass
class LLMResponse:
    """Response from LLM."""
    content: str
    model: str
    usage: dict[str, int] | None = None
    raw_response: Any = None


class BaseLLMInterface(ABC):
    """Abstract base class for LLM interfaces."""
    
    @abstractmethod
    def complete(self, prompt: str, **kwargs: Any) -> LLMResponse:
        """
        Generate a completion for the given prompt.
        
        Args:
            prompt: The input prompt.
            **kwargs: Additional provider-specific parameters.
            
        Returns:
            LLMResponse with the generated content.
        """
        pass
    
    @abstractmethod
    def chat(self, messages: list[dict[str, str]], **kwargs: Any) -> LLMResponse:
        """
        Generate a chat completion.
        
        Args:
            messages: List of message dicts with 'role' and 'content'.
            **kwargs: Additional provider-specific parameters.
            
        Returns:
            LLMResponse with the generated content.
        """
        pass


class LLMInterface:
    """
    Unified LLM interface that delegates to provider-specific implementations.
    """
    
    def __init__(self, config: LLMConfig | None = None):
        """
        Initialize the LLM interface.
        
        Args:
            config: LLM configuration. If None, uses environment defaults.
        """
        self._config = config
        self._client: BaseLLMInterface | None = None
    
    def _get_client(self) -> BaseLLMInterface:
        """Get or create the LLM client."""
        if self._client is None:
            # TODO: Implement client creation based on provider
            raise NotImplementedError(
                "LLM client creation not yet implemented. "
                "Install langchain extras: pip install paranet[llm]"
            )
        return self._client
    
    def complete(self, prompt: str, **kwargs: Any) -> LLMResponse:
        """Generate a completion."""
        return self._get_client().complete(prompt, **kwargs)
    
    def chat(self, messages: list[dict[str, str]], **kwargs: Any) -> LLMResponse:
        """Generate a chat completion."""
        return self._get_client().chat(messages, **kwargs)
    
    @property
    def is_configured(self) -> bool:
        """Check if the LLM interface is properly configured."""
        return self._config is not None
