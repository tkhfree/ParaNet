"""Common typed IR building blocks."""

from __future__ import annotations

from dataclasses import asdict, dataclass, is_dataclass
from typing import Any

from lynette2.diagnostics import SourceSpan


def _serialize(value: Any) -> Any:
    if is_dataclass(value):
        return {key: _serialize(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


@dataclass(slots=True)
class SerializableModel:
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

