"""Instruction and condition IR for PNE programs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from lynette2.diagnostics import SourceSpan
from lynette2.ir.common import SerializableModel


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

