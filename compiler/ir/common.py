"""Shared diagnostics, source location, and serialization for the compiler IR."""

from __future__ import annotations

from dataclasses import asdict, dataclass, is_dataclass
from enum import Enum
from typing import Any


def _serialize(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


@dataclass(slots=True)
class SourceSpan:
    """Source location for a syntax or semantic element."""

    file: str
    line: int
    column: int
    end_line: int
    end_column: int

    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)


class DiagnosticSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass(slots=True)
class Diagnostic:
    """Compiler diagnostic with optional source span."""

    code: str
    message: str
    severity: DiagnosticSeverity = DiagnosticSeverity.ERROR
    span: SourceSpan | None = None
    notes: list[str] | None = None

    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)


@dataclass(slots=True)
class SerializableModel:
    """Base for IR nodes that support to_dict serialization."""

    def to_dict(self) -> dict[str, Any]:
        return _serialize(self)


@dataclass(slots=True)
class TypeRef(SerializableModel):
    name: str
    width: int | None = None


@dataclass(slots=True)
class ParamIR(SerializableModel):
    name: str
    direction: str | None
    type_ref: TypeRef
    span: SourceSpan | None = None
