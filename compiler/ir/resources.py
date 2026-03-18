"""Resource usage and constraints for placement."""

from __future__ import annotations

from dataclasses import dataclass

from compiler.ir.common import SerializableModel


@dataclass(slots=True)
class ResourceUsage(SerializableModel):
    """Approximate resource usage for a fragment or node."""

    tables: int = 0
    registers: int = 0
    actions: int = 0
    est_match_bits: int = 0
    est_entries: int = 0
