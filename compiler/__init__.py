"""Unified compiler entry for ParaNet.

This package provides a shared frontend/IR/lowering/placement/backend
pipeline for both PNE-style programs and higher-level intent DSLs.

Refactored to use compiler.frontend and compiler.ir without lynette2.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from compiler.frontend import PneParser
    from compiler.ir import ProgramIR

__all__ = [
    "get_pne_parser",
    "ProgramIR",
    "compile_pne_to_program_ir",
    "compile_pne_text_to_program_ir",
    "compile_intent_text_to_program_ir",
]


def get_pne_parser(*, include_paths: list[Path] | None = None) -> PneParser:
    """Return a PNE parser instance."""
    # Delay import so the unified compiler package can be imported
    # without `lark` installed (e.g. when only using Intent IR).
    from compiler.frontend import PneParser

    return PneParser(include_paths=include_paths)


def compile_pne_to_program_ir(source_path: Path) -> "ProgramIR":
    """Convenience helper: PNE file -> ProgramIR."""
    from compiler.semantic.collector_pne_intent import PNEIntentCollector
    from compiler.frontend import PneParser

    # `ProgramIR` is only needed for the return type; importing it here is unnecessary.

    parser = PneParser()
    parse_result = parser.parse_file(source_path)
    if parse_result.ast is None:
        raise ValueError(f"Failed to parse PNE source: {source_path}")

    collector = PNEIntentCollector()
    semantic_result = collector.collect(parse_result.ast)
    if semantic_result.diagnostics:
        first = semantic_result.diagnostics[0]
        span = first.span
        loc = f" at {span.file}:{span.line}:{span.column}" if span else ""
        raise ValueError(f"Semantic error: {first.message}{loc}")
    return semantic_result.program


def compile_pne_text_to_program_ir(
    pne_text: str,
    *,
    topology_snapshot: dict | None = None,
    file_name: str = "<memory>",
) -> "ProgramIR":
    """Convenience helper: PNE text (+optional embedded intent blocks) -> ProgramIR."""
    from compiler.frontend import PneParser
    from compiler.semantic.collector_pne_intent import PNEIntentCollector
    from compiler.ir.common import DiagnosticSeverity

    parser = PneParser()
    parse_result = parser.parse_text(pne_text, file_name=file_name)
    if parse_result.ast is None:
        raise ValueError("Failed to parse PNE source")

    errors = [d for d in parse_result.diagnostics if d.severity == DiagnosticSeverity.ERROR]
    if errors:
        first = errors[0]
        loc = (
            f" at {first.span.file}:{first.span.line}:{first.span.column}"
            if first.span
            else ""
        )
        raise ValueError(f"Syntax error: {first.message}{loc}")

    collector = PNEIntentCollector()
    semantic_result = collector.collect(parse_result.ast, topology_snapshot=topology_snapshot)
    if semantic_result.diagnostics:
        first = semantic_result.diagnostics[0]
        span = first.span
        loc = f" at {span.file}:{span.line}:{span.column}" if span else ""
        raise ValueError(f"Semantic error: {first.message}{loc}")
    return semantic_result.program


def compile_intent_text_to_program_ir(
    intent_text: str,
    *,
    topology_snapshot: dict | None = None,
    file_name: str = "<memory>",
) -> "ProgramIR":
    """Convenience helper: Intent DSL text -> ProgramIR."""
    from compiler.frontend import IntentParser
    from compiler.frontend.pne_ast import IntentOverlayNode, ProgramNode
    from compiler.semantic.collector_pne_intent import PNEIntentCollector
    from compiler.ir.common import DiagnosticSeverity

    parser = IntentParser()
    parse_result = parser.parse_text(intent_text, file_name=file_name)
    if parse_result.ast is None:
        raise ValueError("Failed to parse Intent DSL")

    errors = [d for d in parse_result.diagnostics if d.severity == DiagnosticSeverity.ERROR]
    if errors:
        first = errors[0]
        loc = (
            f" at {first.span.file}:{first.span.line}:{first.span.column}"
            if first.span
            else ""
        )
        raise ValueError(f"Syntax error: {first.message}{loc}")

    overlay = IntentOverlayNode(intent_program=parse_result.ast)
    program_node = ProgramNode(includes=[], declarations=[overlay])

    collector = PNEIntentCollector()
    semantic_result = collector.collect(program_node, topology_snapshot=topology_snapshot)
    if semantic_result.diagnostics:
        first = semantic_result.diagnostics[0]
        span = first.span
        loc = f" at {span.file}:{span.line}:{span.column}" if span else ""
        raise ValueError(f"Semantic error: {first.message}{loc}")
    return semantic_result.program
