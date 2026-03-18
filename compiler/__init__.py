"""Unified compiler entry for ParaNet.

This package provides a shared frontend/IR/lowering/placement/backend
pipeline for both PNE-style programs and higher-level intent DSLs.

Refactored to use compiler.frontend and compiler.ir without lynette2.
"""

from __future__ import annotations

from pathlib import Path

from compiler.frontend import PneParser
from compiler.ir import ProgramIR

__all__ = [
    "get_pne_parser",
    "ProgramIR",
    "compile_pne_to_program_ir",
]


def get_pne_parser(*, include_paths: list[Path] | None = None) -> PneParser:
    """Return a PNE parser instance."""
    return PneParser(include_paths=include_paths)


def compile_pne_to_program_ir(source_path: Path) -> ProgramIR:
    """Convenience helper: PNE file -> ProgramIR."""
    from compiler.semantic.collector_pne import ProgramCollector

    parser = PneParser()
    parse_result = parser.parse_file(source_path)
    if parse_result.ast is None:
        raise ValueError(f"Failed to parse PNE source: {source_path}")

    collector = ProgramCollector()
    semantic_result = collector.collect(parse_result.ast)
    if semantic_result.diagnostics:
        first = semantic_result.diagnostics[0]
        span = first.span
        loc = f" at {span.file}:{span.line}:{span.column}" if span else ""
        raise ValueError(f"Semantic error: {first.message}{loc}")
    return semantic_result.program
