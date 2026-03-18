"""Backend capability models for device-specific constraints."""

from __future__ import annotations

from dataclasses import dataclass

from compiler.ir.common import SerializableModel


@dataclass(slots=True)
class BackendCapability(SerializableModel):
    """Capability profile for a target backend (v1model, TNA, etc.)."""

    name: str = "v1model"
    max_tables_per_stage: int = 8
    max_stages: int = 32
    supports_ternary: bool = True
    supports_range: bool = True
