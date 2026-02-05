"""
Backend Base Module

Abstract base class for code generation backends.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from paranet.compiler.ir.intent_ir import IntentIR


@dataclass
class BackendResult:
    """Result of backend code generation."""
    success: bool
    output: dict[str, str] = field(default_factory=dict)  # filename -> content
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseBackend(ABC):
    """
    Abstract base class for compiler backends.
    
    Each backend generates configuration/code for a specific target platform.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Backend name identifier."""
        pass
    
    @property
    @abstractmethod
    def target_protocol(self) -> str:
        """Target protocol/platform (ip, ndn, geo, p4)."""
        pass
    
    @abstractmethod
    def compile(self, ir: IntentIR) -> BackendResult:
        """
        Compile Intent IR to target platform configuration.
        
        Args:
            ir: Intent IR to compile.
            
        Returns:
            BackendResult with generated output.
        """
        pass
    
    def validate_ir(self, ir: IntentIR) -> list[str]:
        """
        Validate IR compatibility with this backend.
        
        Args:
            ir: Intent IR to validate.
            
        Returns:
            List of validation errors (empty if compatible).
        """
        return ir.validate()
    
    def supports_ir_type(self, ir: IntentIR) -> bool:
        """
        Check if this backend can handle the given IR.
        
        Args:
            ir: Intent IR to check.
            
        Returns:
            True if this backend can compile the IR.
        """
        # Default: all backends can attempt compilation
        return True
