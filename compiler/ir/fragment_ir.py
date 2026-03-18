"""Fragment-level IR for lowered PNE/intent programs."""

from __future__ import annotations

from dataclasses import dataclass, field

from compiler.ir.common import SerializableModel, SourceSpan
from compiler.ir.instructions_ir import InstructionIR
from compiler.ir.resources import ResourceUsage


@dataclass(slots=True)
class FragmentIR(SerializableModel):
    """A lowered, self-contained slice of program logic."""

    id: str
    service: str | None = None
    application: str | None = None
    module: str | None = None
    kind: str = "body"  # "head" | "body" | "tail"

    instructions: list[InstructionIR] = field(default_factory=list)
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)

    header_uses: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)

    resources: ResourceUsage = field(default_factory=ResourceUsage)
    span: SourceSpan | None = None
