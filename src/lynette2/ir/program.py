"""Program-level IR for the standalone PNE compiler."""

from __future__ import annotations

from dataclasses import dataclass, field

from lynette2.diagnostics import SourceSpan
from lynette2.ir.common import ParamIR, SerializableModel, TypeRef
from lynette2.ir.instructions import InstructionIR
from lynette2.ir.state import FunctionIR, MapDeclIR, RegisterDeclIR, SetDeclIR


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

