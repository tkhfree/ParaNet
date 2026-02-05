"""
Base Tool Module

Defines the base class and interfaces for agent tools.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ToolStatus(Enum):
    """Tool execution status."""
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


@dataclass
class ToolResult:
    """Result of a tool execution."""
    status: ToolStatus
    data: Any = None
    message: str = ""
    errors: list[str] = field(default_factory=list)
    
    @classmethod
    def success(cls, data: Any = None, message: str = "") -> "ToolResult":
        """Create a successful result."""
        return cls(status=ToolStatus.SUCCESS, data=data, message=message)
    
    @classmethod
    def error(cls, message: str, errors: list[str] | None = None) -> "ToolResult":
        """Create an error result."""
        return cls(
            status=ToolStatus.ERROR,
            message=message,
            errors=errors or [message]
        )


@dataclass
class ToolParameter:
    """Definition of a tool parameter."""
    name: str
    description: str
    type: str
    required: bool = True
    default: Any = None


class BaseTool(ABC):
    """
    Abstract base class for agent tools.
    
    Tools are the primary way the agent interacts with the network system.
    Each tool should:
    - Have a clear, single purpose
    - Validate inputs
    - Return structured results
    - Handle errors gracefully
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name used for invocation."""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does."""
        pass
    
    @property
    @abstractmethod
    def parameters(self) -> list[ToolParameter]:
        """List of parameters the tool accepts."""
        pass
    
    @abstractmethod
    def execute(self, **kwargs: Any) -> ToolResult:
        """
        Execute the tool with given parameters.
        
        Args:
            **kwargs: Tool parameters.
            
        Returns:
            ToolResult with execution outcome.
        """
        pass
    
    def validate_params(self, **kwargs: Any) -> list[str]:
        """
        Validate provided parameters against tool definition.
        
        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        param_names = {p.name for p in self.parameters}
        
        # Check required parameters
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                errors.append(f"Missing required parameter: {param.name}")
        
        # Check for unknown parameters
        for key in kwargs:
            if key not in param_names:
                errors.append(f"Unknown parameter: {key}")
        
        return errors
    
    def to_schema(self) -> dict[str, Any]:
        """Convert tool definition to JSON schema for LLM."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    p.name: {
                        "type": p.type,
                        "description": p.description,
                    }
                    for p in self.parameters
                },
                "required": [p.name for p in self.parameters if p.required],
            },
        }
