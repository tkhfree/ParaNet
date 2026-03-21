"""Build FragmentIR from ProgramIR (MVP v0: one fragment per module, one per non-empty application)."""

from __future__ import annotations

from typing import Any

from compiler.ir import FragmentIR, ModuleIR, ProgramIR


def _parser_header_roots(module: ModuleIR) -> list[str]:
    roots: list[str] = []
    for header in module.parser_headers:
        if isinstance(header, dict):
            kind = header.get("kind")
            if kind == "identifier":
                name = header.get("name")
                if isinstance(name, str):
                    roots.append(name)
            continue
        name = getattr(header, "name", None)
        if isinstance(name, str):
            roots.append(name)
            continue
        parts = getattr(header, "parts", None)
        if isinstance(parts, list) and parts:
            if parts[0] == "hdr" and len(parts) > 1:
                roots.append(str(parts[1]))
            else:
                roots.append(str(parts[0]))
    return roots


def build_fragments_from_program(program: ProgramIR) -> list[FragmentIR]:
    """Convert ProgramIR to FragmentIR list (v0 decomposition rules; see docs/topology-snapshot-schema.md)."""
    fragments: list[FragmentIR] = []

    for name, mod in program.modules.items():
        fragments.append(
            FragmentIR(
                id=f"module:{name}",
                module=name,
                instructions=list(mod.body),
                header_uses=_parser_header_roots(mod),
                dependencies=[],
            )
        )

    for name, app in program.applications.items():
        if not app.body:
            continue
        fragments.append(
            FragmentIR(
                id=f"application:{name}",
                application=name,
                instructions=list(app.body),
                header_uses=[],
                dependencies=[],
            )
        )

    return fragments


__all__ = ["build_fragments_from_program"]
