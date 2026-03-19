"""
Intent DSL AST -> IntentIR collection.

This keeps the intent compilation “semantic” step inside the unified `compiler/` package.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from compiler.frontend.intent_ast import IntentProgramNode
from compiler.ir import IntentIR
from compiler.ir.common import Diagnostic


@dataclass(slots=True)
class IntentToIRResult:
    intent_ir: IntentIR = field(default_factory=IntentIR)
    diagnostics: list[Diagnostic] = field(default_factory=list)


class IntentIRCollector:
    """Lower Intent AST into IntentIR (placeholder)."""

    def collect(self, program_node: IntentProgramNode) -> IntentToIRResult:
        # TODO: implement real lowering (routes/policies/networks -> IR graph)
        return IntentToIRResult(intent_ir=IntentIR.from_ast(program_node), diagnostics=[])


__all__ = ["IntentIRCollector", "IntentToIRResult"]

