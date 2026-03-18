"""Instruction and condition IR for PNE programs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SerializableModel, SourceSpan


@dataclass(slots=True)
class ConditionIR(SerializableModel):
    kind: str
    operator: str | None = None
    left: Any = None
    right: Any = None


@dataclass(slots=True)
class InstructionIR(SerializableModel):
    kind: str
    data: dict[str, Any] = field(default_factory=dict)
    span: SourceSpan | None = None
