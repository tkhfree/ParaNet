"""Intent semantic collector placeholder."""

from __future__ import annotations

from dataclasses import dataclass, field

from compiler.frontend.intent_ast import IntentProgramNode
from compiler.ir import ProgramIR
from compiler.ir.common import Diagnostic


@dataclass(slots=True)
class IntentSemanticResult:
    program: ProgramIR = field(default_factory=ProgramIR)
    diagnostics: list[Diagnostic] = field(default_factory=list)


class IntentCollector:
    """Lower intent AST into ProgramIR (placeholder)."""

    def collect(self, program_node: IntentProgramNode) -> IntentSemanticResult:
        return IntentSemanticResult()

