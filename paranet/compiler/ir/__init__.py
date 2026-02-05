"""
Compiler IR (Intermediate Representation) Module

Protocol-agnostic intent representation:
- Unified intent expression
- Semantic validation
- Optimization passes
"""

from paranet.compiler.ir.intent_ir import IntentIR, IRNode, IRType

__all__ = [
    "IntentIR",
    "IRNode",
    "IRType",
]
