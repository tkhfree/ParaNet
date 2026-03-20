"""Recursive include and domain expansion for PNE sources."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan

INCLUDE_RE = re.compile(
    r'^\s*#include\s*(?P<open><|")(?P<path>[^>"]+)(?P<close>>|")\s*$'
)


@dataclass(slots=True)
class IncludeDirective:
    path: str
    is_system: bool
    is_domain: bool
    resolved_path: Path | None
    span: SourceSpan
    source_file: Path


@dataclass(slots=True)
class SourceUnit:
    path: Path
    body_text: str
    includes: list[IncludeDirective] = field(default_factory=list)


@dataclass(slots=True)
class PreprocessedProgram:
    root_file: Path
    units: list[SourceUnit] = field(default_factory=list)
    includes: list[IncludeDirective] = field(default_factory=list)


class Preprocessor:
    """Resolve include trees without mutating source files."""

    def __init__(self, include_paths: list[Path] | None = None):
        self.include_paths = [path.resolve() for path in include_paths or []]

    def preprocess_file(
        self, path: Path
    ) -> tuple[PreprocessedProgram | None, list[Diagnostic]]:
        diagnostics: list[Diagnostic] = []
        root_path = path.resolve()
        if not root_path.exists():
            diagnostics.append(
                Diagnostic(
                    code="PRE001",
                    message=f"Source file not found: {root_path}",
                    severity=DiagnosticSeverity.ERROR,
                    span=SourceSpan(
                        file=str(root_path),
                        line=1,
                        column=1,
                        end_line=1,
                        end_column=1,
                    ),
                )
            )
            return None, diagnostics

        program = PreprocessedProgram(root_file=root_path)
        seen: set[Path] = set()
        self._collect_units(
            current_path=root_path,
            program=program,
            seen=seen,
            stack=[],
            diagnostics=diagnostics,
        )
        return program, diagnostics

    def preprocess_text(
        self, text: str, virtual_path: Path
    ) -> tuple[PreprocessedProgram, list[Diagnostic]]:
        """
        Preprocess PNE source text that may contain `#include` directives.

        This is similar to `preprocess_file()`, but does not require `virtual_path`
        to exist on disk. It is mainly used when compiling editor-provided text.
        """
        diagnostics: list[Diagnostic] = []
        root_path = virtual_path if virtual_path.is_absolute() else virtual_path.absolute()

        program = PreprocessedProgram(root_file=root_path)
        seen: set[Path] = set()
        stack: list[Path] = [root_path]

        lines = text.splitlines()
        body_lines: list[str] = []
        unit_includes: list[IncludeDirective] = []

        for line_no, line in enumerate(lines, start=1):
            match = INCLUDE_RE.match(line)
            if not match:
                body_lines.append(line)
                continue

            include_path = match.group("path").strip()
            is_system = match.group("open") == "<"
            is_domain = include_path.endswith(".domain")
            span = SourceSpan(
                file=str(root_path),
                line=line_no,
                column=1,
                end_line=line_no,
                end_column=len(line) + 1,
            )
            resolved = self._resolve_include(root_path, include_path)
            include = IncludeDirective(
                path=include_path,
                is_system=is_system,
                is_domain=is_domain,
                resolved_path=resolved,
                span=span,
                source_file=root_path,
            )
            unit_includes.append(include)
            program.includes.append(include)
            body_lines.append("")

            if resolved is None:
                diagnostics.append(
                    Diagnostic(
                        code="PRE003",
                        message=f"Unable to resolve include '{include_path}' from {root_path}",
                        severity=DiagnosticSeverity.ERROR,
                        span=span,
                    )
                )
                continue

            self._collect_units(
                current_path=resolved,
                program=program,
                seen=seen,
                stack=stack,
                diagnostics=diagnostics,
            )

        stack.pop()
        program.units.append(
            SourceUnit(
                path=root_path,
                body_text="\n".join(body_lines) + "\n",
                includes=unit_includes,
            )
        )
        return program, diagnostics

    def _collect_units(
        self,
        current_path: Path,
        program: PreprocessedProgram,
        seen: set[Path],
        stack: list[Path],
        diagnostics: list[Diagnostic],
    ) -> None:
        if current_path in stack:
            diagnostics.append(
                Diagnostic(
                    code="PRE002",
                    message=f"Include cycle detected at {current_path}",
                    severity=DiagnosticSeverity.ERROR,
                    span=SourceSpan(
                        file=str(current_path),
                        line=1,
                        column=1,
                        end_line=1,
                        end_column=1,
                    ),
                )
            )
            return
        if current_path in seen:
            return

        stack.append(current_path)
        seen.add(current_path)
        lines = current_path.read_text(encoding="utf-8").splitlines()

        body_lines: list[str] = []
        unit_includes: list[IncludeDirective] = []
        for line_no, line in enumerate(lines, start=1):
            match = INCLUDE_RE.match(line)
            if not match:
                body_lines.append(line)
                continue

            include_path = match.group("path").strip()
            is_system = match.group("open") == "<"
            is_domain = include_path.endswith(".domain")
            span = SourceSpan(
                file=str(current_path),
                line=line_no,
                column=1,
                end_line=line_no,
                end_column=len(line) + 1,
            )
            resolved = self._resolve_include(current_path, include_path)
            include = IncludeDirective(
                path=include_path,
                is_system=is_system,
                is_domain=is_domain,
                resolved_path=resolved,
                span=span,
                source_file=current_path,
            )
            unit_includes.append(include)
            program.includes.append(include)
            body_lines.append("")

            if resolved is None:
                diagnostics.append(
                    Diagnostic(
                        code="PRE003",
                        message=f"Unable to resolve include '{include_path}' from {current_path}",
                        severity=DiagnosticSeverity.ERROR,
                        span=span,
                    )
                )
                continue

            self._collect_units(
                current_path=resolved,
                program=program,
                seen=seen,
                stack=stack,
                diagnostics=diagnostics,
            )

        program.units.append(
            SourceUnit(
                path=current_path,
                body_text="\n".join(body_lines) + "\n",
                includes=unit_includes,
            )
        )
        stack.pop()

    def _resolve_include(self, current_path: Path, include_path: str) -> Path | None:
        candidate = Path(include_path)
        if candidate.is_absolute() and candidate.exists():
            return candidate.resolve()

        search_roots: list[Path] = [current_path.parent, current_path.parent / "include"]
        for root in self.include_paths:
            search_roots.append(root)
            search_roots.append(root / "include")

        for root in search_roots:
            resolved = (root / include_path).resolve()
            if resolved.exists():
                return resolved
        return None


__all__ = [
    "IncludeDirective",
    "PreprocessedProgram",
    "Preprocessor",
    "SourceUnit",
]
