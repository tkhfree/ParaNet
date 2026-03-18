"""Semantic validator placeholder."""

from __future__ import annotations

from compiler.ir import ProgramIR
from compiler.ir.common import Diagnostic


def validate_program(program: ProgramIR) -> list[Diagnostic]:
    """Return semantic diagnostics for ProgramIR.

    TODO: implement symbol, type and reference validations.
    """
    return []

