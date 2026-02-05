"""
ParaNet Compiler Module

Multi-modal compiler for network intent translation:
- DSL/YAML frontend parsing
- Protocol-agnostic intent IR
- Multi-target code generation backends
"""

from paranet.compiler.frontend import DSLParser
from paranet.compiler.ir import IntentIR

__all__ = [
    "DSLParser",
    "IntentIR",
]
