"""Lowering passes from ProgramIR to FragmentIR."""

from __future__ import annotations

from compiler.ir import FragmentIR, ProgramIR
from compiler.lowering.fragment_builder import build_fragments_from_program


def build_fragments(program: ProgramIR) -> list[FragmentIR]:
    """Build FragmentIR list from ProgramIR."""
    return build_fragments_from_program(program)


__all__ = ["build_fragments"]

