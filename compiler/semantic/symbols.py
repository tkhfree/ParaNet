"""Symbol table placeholders for semantic passes."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class SymbolTable:
    """Minimal symbol table scaffold."""

    values: dict[str, str] = field(default_factory=dict)

