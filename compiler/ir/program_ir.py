"""Program-level IR for PNE semantics."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import ParamIR, SerializableModel, SourceSpan, TypeRef
from compiler.ir.instructions_ir import InstructionIR


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


@dataclass(slots=True)
class ServiceIR(SerializableModel):
    name: str
    application_chain: list[str] = field(default_factory=list)
    span: SourceSpan | None = None


@dataclass(slots=True)
class ApplicationIR(SerializableModel):
    name: str
    parser_name: str | None = None
    local_vars: dict[str, TypeRef] = field(default_factory=dict)
    body: list[InstructionIR] = field(default_factory=list)
    span: SourceSpan | None = None


@dataclass(slots=True)
class ModuleIR(SerializableModel):
    name: str
    params: list[ParamIR] = field(default_factory=list)
    parser_name: str | None = None
    parser_headers: list[object] = field(default_factory=list)
    local_vars: dict[str, TypeRef] = field(default_factory=dict)
    maps: dict[str, MapDeclIR] = field(default_factory=dict)
    sets: dict[str, SetDeclIR] = field(default_factory=dict)
    registers: dict[str, RegisterDeclIR] = field(default_factory=dict)
    functions: dict[str, FunctionIR] = field(default_factory=dict)
    body: list[InstructionIR] = field(default_factory=list)
    span: SourceSpan | None = None


@dataclass(slots=True)
class ProgramIR(SerializableModel):
    services: dict[str, ServiceIR] = field(default_factory=dict)
    applications: dict[str, ApplicationIR] = field(default_factory=dict)
    modules: dict[str, ModuleIR] = field(default_factory=dict)
    type_aliases: dict[str, TypeRef] = field(default_factory=dict)
    constants: dict[str, str] = field(default_factory=dict)
    # Extra compilation context (e.g. topology snapshot).
    metadata: dict[str, Any] = field(default_factory=dict)
