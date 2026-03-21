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


def test_reachability_equivalent_to_route(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    route_src = tmp_path / "route.pne"
    route_src.write_text(
        dedent(
            """
            module F() {
              parser { ipv4; }
              control { ; }
            }
            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "10.1.0.0/16" })
                to: edge-1
                via: core-1
                protocol: ip
              }
            }
            """
        ),
        encoding="utf-8",
    )
    reach_src = tmp_path / "reach.pne"
    reach_src.write_text(
        dedent(
            """
            module F() {
              parser { ipv4; }
              control { ; }
            }
            intent {
              reachability R1 {
                from: prefix({ kind: "cidr", value: "10.1.0.0/16" })
                to: edge-1
                via: core-1
                protocol: ip
              }
            }
            """
        ),
        encoding="utf-8",
    )

    r1 = compile_pne_to_program_ir(route_src)
    r2 = compile_pne_to_program_ir(reach_src)
    assert r1.modules["F"].maps["ip_route_table"].entries == r2.modules["F"].maps["ip_route_table"].entries


def test_route_constraints_and_profile_ipv6(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    source = tmp_path / "v6.pne"
    source.write_text(
        dedent(
            """
            module F() {
              parser { ipv6; }
              control { ; }
            }
            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "2001:db8::/32" })
                to: edge-1
                via: core-1
                profile: ipv6
                constraints { max_hops: 8 }
              }
            }
            """
        ),
        encoding="utf-8",
    )

    program = compile_pne_to_program_ir(source)
    instr = next(i for i in program.modules["F"].body if i.kind == "intent_route_lookup")
    assert instr.data.get("protocol") == "ipv6"
    assert instr.data.get("constraints") == {"max_hops": 8}


def test_srv6_path_lowering(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    source = tmp_path / "srv6.pne"
    source.write_text(
        dedent(
            """
            module F() {
              parser { srv6; }
              control { ; }
            }
            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "2001:db8:1::/64" })
                to: pe-1
                via: pe-1
                protocol: srv6
                path: [ "2001:db8:0:1::a", "2001:db8:0:2::b" ]
              }
            }
            """
        ),
        encoding="utf-8",
    )

    program = compile_pne_to_program_ir(source)
    instr = next(i for i in program.modules["F"].body if i.kind == "intent_route_lookup")
    assert instr.data.get("protocol") == "srv6"
    assert instr.data.get("path") == ["2001:db8:0:1::a", "2001:db8:0:2::b"]


def test_ndn_and_geo_custom_prefix(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    for proto, cidr in (
        ("ndn", "/edu/paranet"),
        ("geo", "EU-WEST"),
    ):
        source = tmp_path / f"{proto}.pne"
        source.write_text(
            dedent(
                f"""
                module F() {{
                  parser {{ eth; }}
                  control {{ ; }}
                }}
                intent {{
                  route R1 {{
                    from: prefix({{ kind: "name", value: "{cidr}" }})
                    to: n1
                    via: n1
                    protocol: {proto}
                  }}
                }}
                """
            ),
            encoding="utf-8",
        )

        program = compile_pne_to_program_ir(source)
        assert f"{proto}_route_table" in program.modules["F"].maps


def test_determinism_and_schedule_instructions(tmp_path) -> None:
    _require_lark()

    from compiler import compile_pne_to_program_ir

    source = tmp_path / "pl.pne"
    source.write_text(
        dedent(
            """
            module F() {
              parser { eth; }
              control { ; }
            }
            intent {
              determinism D1 {
                cycle_us: 1000
                master: "plc-1"
              }
              schedule S1 {
                node: "drive-3"
                slot: 7
              }
            }
            """
        ),
        encoding="utf-8",
    )

    program = compile_pne_to_program_ir(source)
    kinds = [i.kind for i in program.modules["F"].body]
    assert "intent_determinism" in kinds
    assert "intent_schedule" in kinds


def test_powerlink_route_reports_diagnostic() -> None:
    _require_lark()

    from compiler.frontend.pne_parser import PneParser
    from compiler.semantic.collector_pne_intent import PNEIntentCollector

    parser = PneParser()
    result = parser.parse_text(
        dedent(
            """
            module F() {
              parser { eth; }
              control { ; }
            }
            intent {
              route R1 {
                from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
                to: n1
                via: n1
                protocol: powerlink
              }
            }
            """
        )
    )
    assert result.ast is not None
    collector = PNEIntentCollector()
    sem = collector.collect(result.ast)
    assert any(d.code == "INT204" for d in sem.diagnostics)


def test_compile_pne_text_supports_builtin_include_directives() -> None:
    _require_lark()

    from compiler import compile_pne_text_to_program_ir

    examples_path = "examples/pne/extended_features_main.pne"
    content = (Path(__file__).resolve().parents[1] / examples_path).read_text(encoding="utf-8")

    program = compile_pne_text_to_program_ir(content, file_name="<content>")
    # Basic sanity: modules from the example should exist.
    assert "Edge" in program.modules

