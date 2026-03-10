"""Golden and semantic tests for the standalone lynette2 frontend."""

from __future__ import annotations

import json
from pathlib import Path

from lynette2.frontend.ast import ApplicationNode, ModuleNode, ProgramNode, ServiceNode
from lynette2.frontend.parser import PneParser
from lynette2.semantic.collector import ProgramCollector


GOLDEN_DIR = Path(__file__).parent / "golden" / "lynette2"


def _load_golden(name: str) -> dict:
    return json.loads((GOLDEN_DIR / name).read_text(encoding="utf-8"))


def _make_parser() -> PneParser:
    return PneParser(include_paths=[Path("examples/pne"), Path("examples/pne/include")])


def _summarize_ast(program: ProgramNode) -> dict:
    declarations: list[dict] = []
    for decl in program.declarations:
        if isinstance(decl, ModuleNode):
            declarations.append(
                {
                    "type": "module",
                    "name": decl.name,
                    "param_names": [param.name for param in decl.params],
                    "parser_headers": [
                        ".".join(getattr(header, "parts", []))
                        for header in (decl.parser_block.headers if decl.parser_block else [])
                    ],
                    "statement_types": [
                        statement.__class__.__name__
                        for statement in (
                            decl.control_block.statements if decl.control_block else []
                        )
                    ],
                }
            )
        elif isinstance(decl, ApplicationNode):
            declarations.append(
                {
                    "type": "application",
                    "name": decl.name,
                    "parser_name": decl.parser_name,
                    "statement_types": [statement.__class__.__name__ for statement in decl.body],
                }
            )
        elif isinstance(decl, ServiceNode):
            declarations.append(
                {
                    "type": "service",
                    "name": decl.name,
                    "applications": list(decl.applications),
                }
            )

    return {
        "includes": [
            {"path": item.path, "is_domain": item.is_domain, "source": Path(item.resolved_from).name}
            for item in program.includes
        ],
        "declarations": declarations,
    }


def _summarize_program_ir(program_ir) -> dict:
    return {
        "services": {
            name: service.application_chain for name, service in sorted(program_ir.services.items())
        },
        "applications": {
            name: {
                "parser_name": app.parser_name,
                "locals": sorted(app.local_vars.keys()),
                "body_kinds": [instruction.kind for instruction in app.body],
            }
            for name, app in sorted(program_ir.applications.items())
        },
        "modules": {
            name: {
                "params": [param.name for param in module.params],
                "parser_headers": [
                    ".".join(header["parts"])
                    for header in module.parser_headers
                    if isinstance(header, dict) and header.get("kind") == "field"
                ],
                "locals": sorted(module.local_vars.keys()),
                "maps": sorted(module.maps.keys()),
                "sets": sorted(module.sets.keys()),
                "registers": sorted(module.registers.keys()),
                "functions": sorted(module.functions.keys()),
                "body_kinds": [instruction.kind for instruction in module.body],
            }
            for name, module in sorted(program_ir.modules.items())
        },
    }


def test_alice_ast_golden(project_root: Path):
    parser = _make_parser()
    result = parser.parse_file(project_root / "examples/pne/alice_router_main.pne")

    assert [item.to_dict() for item in result.diagnostics] == []
    assert result.ast is not None
    assert _summarize_ast(result.ast) == _load_golden("alice_ast_summary.json")


def test_extended_program_ir_golden(project_root: Path):
    parser = _make_parser()
    parsed = parser.parse_file(project_root / "examples/pne/extended_features_main.pne")

    assert [item.to_dict() for item in parsed.diagnostics] == []
    assert parsed.ast is not None

    semantic = ProgramCollector().collect(parsed.ast)
    assert [item.to_dict() for item in semantic.diagnostics] == []
    assert _summarize_program_ir(semantic.program) == _load_golden(
        "extended_program_ir_summary.json"
    )


def test_domain_include_is_recorded(project_root: Path):
    parser = _make_parser()
    result = parser.parse_file(project_root / "examples/pne/extended_features_main.pne")

    assert result.ast is not None
    include_paths = [item.path for item in result.ast.includes]
    assert "extended.domain" in include_paths
    assert "extended_modules.pne" in include_paths


def test_undefined_apply_reports_semantic_diagnostic():
    parser = _make_parser()
    parsed = parser.parse_text(
        """
        application Router using Parser {
            Missing.apply();
        }
        """
    )

    assert parsed.ast is not None
    semantic = ProgramCollector().collect(parsed.ast)

    assert any(item.code == "SEM020" for item in semantic.diagnostics)

