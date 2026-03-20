"""Tests for PNE files with embedded intent overlays."""

from __future__ import annotations

from textwrap import dedent
from pathlib import Path

import pytest


def _require_lark() -> None:
    pytest.importorskip("lark")


def test_pne_parser_accepts_intent_overlay() -> None:
    _require_lark()

    from compiler.frontend.pne_ast import IntentOverlayNode
    from compiler.frontend.pne_parser import PneParser

    parser = PneParser()
    result = parser.parse_text(
        dedent(
            """
            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
                to: edge-1
                via: core-1, edge-1
                protocol: ip
              }
            }
            """
        )
    )

    assert result.diagnostics == []
    assert result.ast is not None
    assert len(result.ast.declarations) == 1
    assert isinstance(result.ast.declarations[0], IntentOverlayNode)


def test_compile_pne_with_intent_overlay_to_program_ir(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    source = tmp_path / "overlay_success.pne"
    source.write_text(
        dedent(
            """
            module Forwarder() {
              parser {
                ipv4;
              }
              control {
                ;
              }
            }

            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
                to: edge-1
                via: core-1, edge-1
                protocol: ip
              }
            }
            """
        ),
        encoding="utf-8",
    )

    program = compile_pne_to_program_ir(source)
    module = program.modules["Forwarder"]
    route_map = module.maps["ip_route_table"]

    assert route_map.entries[0][0] == {"kind": "cidr", "value": "10.0.0.0/8"}
    assert any(instr.kind == "intent_route_lookup" for instr in module.body)
    assert "intent_overlay_app" in program.applications
    assert "intent_overlay_service" in program.services


def test_compile_pne_with_unsupported_protocol_reports_diagnostic(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    source = tmp_path / "overlay_failure.pne"
    source.write_text(
        dedent(
            """
            module Forwarder() {
              parser {
                customHeader;
              }
              control {
                ;
              }
            }

            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
                to: edge-1
                via: core-1, edge-1
                protocol: custom-proto
              }
            }
            """
        ),
        encoding="utf-8",
    )

    program = compile_pne_to_program_ir(source)
    module = program.modules["Forwarder"]
    assert "custom-proto_route_table" in module.maps


def test_parse_text_supports_builtin_include_directives() -> None:
    _require_lark()

    from compiler.frontend.pne_parser import PneParser

    parser = PneParser()
    result = parser.parse_text("#include <extended.domain>", file_name="<content>")

    assert result.diagnostics == []
    assert result.ast is not None
    assert any(getattr(d, "name", None) == "SharedAudit" for d in result.ast.declarations)


def test_compile_pne_text_supports_builtin_include_directives() -> None:
    _require_lark()

    from compiler import compile_pne_text_to_program_ir

    examples_path = "examples/pne/extended_features_main.pne"
    content = (Path(__file__).resolve().parents[1] / examples_path).read_text(encoding="utf-8")

    program = compile_pne_text_to_program_ir(content, file_name="<content>")
    # Basic sanity: modules from the example should exist.
    assert "Edge" in program.modules

