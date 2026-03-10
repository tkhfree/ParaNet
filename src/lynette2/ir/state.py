"""State and callable IR declarations."""

from __future__ import annotations

from dataclasses import dataclass, field

from lynette2.diagnostics import SourceSpan
from lynette2.ir.common import ParamIR, SerializableModel, TypeRef
from lynette2.ir.instructions import InstructionIR


@dataclass(slots=True)
class MapDeclIR(SerializableModel):
    name: str
    key_types: list[TypeRef] = field(default_factory=list)
    value_types: list[TypeRef] = field(default_factory=list)
    size: int | None = None
    entries: list[list[object]] = field(default_factory=list)
    is_static: bool = False
    span: SourceSpan | None = None


@dataclass(slots=True)
class SetDeclIR(SerializableModel):
    names: list[str] = field(default_factory=list)
    key_types: list[TypeRef] = field(default_factory=list)
    entries: list[list[object]] = field(default_factory=list)
    is_static: bool = False
    span: SourceSpan | None = None


@dataclass(slots=True)
class RegisterDeclIR(SerializableModel):
    name: str
    value_type: TypeRef
    size: int | None = None
    is_static: bool = False
    span: SourceSpan | None = None


@dataclass(slots=True)
class FunctionIR(SerializableModel):
    name: str
    params: list[ParamIR] = field(default_factory=list)
    body: list[InstructionIR] = field(default_factory=list)
    span: SourceSpan | None = None

