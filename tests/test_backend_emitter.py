"""Backend emitters: BMv2 / Tofino / stub from NodePlanIR + fragments."""

from __future__ import annotations

from textwrap import dedent

import pytest


def _require_lark() -> None:
    pytest.importorskip("lark")


def test_bmv2_emitter_produces_v1model_and_route_entries() -> None:
    _require_lark()

    from compiler.pipeline import compile_pipeline

    topo = {
        "id": "demo",
        "nodes": [{"id": "core-1"}, {"id": "edge-1"}],
        "links": [],
    }
    pne = dedent(
        """
        module Forwarder() {
          parser { ipv4; }
          control { ; }
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
    )

    result = compile_pipeline(pne, topology_snapshot=topo, override_target="bmv2")
    assert result.artifacts.get("targetMode") == "per_node"
    assert result.artifacts.get("override_target") == "bmv2"
    nodes = result.artifacts.get("nodes") or []
    assert len(nodes) >= 1
    p4 = nodes[0].get("program_p4") or ""
    assert "V1Switch(" in p4
    assert "table ipv4_lpm" in p4
    entries = nodes[0].get("entries") or {}
    assert entries.get("target") == "bmv2"
    assert "simple_switch_cli" in entries
    dest_map = entries.get("destination_to_port") or {}
    assert "edge-1" in dest_map


def test_tofino_emitter_includes_tna_includes() -> None:
    _require_lark()

    from compiler.pipeline import compile_pipeline

    pne = dedent(
        """
        module Forwarder() {
          parser { ipv4; }
          control { ; }
        }
        intent {
          route R1 {
            from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
            to: edge-1
            protocol: ip
          }
        }
        """
    )

    result = compile_pipeline(pne, topology_snapshot=None, target="tofino")
    p4 = (result.artifacts.get("nodes") or [{}])[0].get("program_p4") or ""
    assert "#include <tna.p4>" in p4
    assert "ParanetIngress_" in p4
    assert "table ipv4_lpm" in p4


def test_stub_emitter_target() -> None:
    _require_lark()

    from compiler.pipeline import compile_pipeline

    result = compile_pipeline("module M() { parser { ipv4; } control { ; } }", target="stub")
    p4 = (result.artifacts.get("nodes") or [{}])[0].get("program_p4") or ""
    assert "stub" in p4.lower()
