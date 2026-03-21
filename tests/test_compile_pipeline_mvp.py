"""MVP compile pipeline: ProgramIR -> FragmentIR -> NodePlanIR -> stub artifacts."""

from __future__ import annotations

from textwrap import dedent

import pytest


def _require_lark() -> None:
    pytest.importorskip("lark")


def test_compile_pipeline_two_nodes_and_artifacts(tmp_path) -> None:
    _require_lark()

    from compiler.ir.common import DiagnosticSeverity
    from compiler.pipeline import compile_pipeline

    topo = {
        "id": "demo",
        "nodes": [{"id": "core-1", "name": "Core"}, {"id": "edge-1", "name": "Edge"}],
        "links": [{"id": "l1", "source": "core-1", "target": "edge-1"}],
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

    out = tmp_path / "out"
    result = compile_pipeline(pne, topology_snapshot=topo, output_dir=out)

    assert not any(d.severity == DiagnosticSeverity.ERROR for d in result.diagnostics)
    assert all(d.phase == "semantic" for d in result.diagnostics)
    assert result.program is not None
    assert len(result.fragments) >= 1
    assert len(result.node_plans) == 2
    assert (out / "manifest.json").is_file()
    assert (out / "core-1" / "program.p4").is_file()
    assert (out / "edge-1" / "entries.json").is_file()


def test_topology_validation_unknown_node() -> None:
    _require_lark()

    from compiler.pipeline import compile_pipeline

    topo = {"nodes": [{"id": "only-one"}]}
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
            via: core-1
            protocol: ip
          }
        }
        """
    )

    result = compile_pipeline(pne, topology_snapshot=topo)
    assert any(d.code == "TOP001" for d in result.diagnostics)
    assert all(d.phase == "semantic" for d in result.diagnostics)
    assert result.program is not None
    assert result.fragments == []


def test_compile_pipeline_without_topology_skips_topology_validation() -> None:
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
            via: core-1, edge-1
            protocol: ip
          }
        }
        """
    )

    result = compile_pipeline(pne, topology_snapshot=None)
    assert result.program is not None
    assert len(result.node_plans) == 1
    assert result.node_plans[0].node_id == "default"


def test_diagnostics_tagged_with_parse_phase_on_syntax_error() -> None:
    _require_lark()

    from compiler.ir.common import DiagnosticSeverity
    from compiler.pipeline import compile_pipeline

    result = compile_pipeline("this is not valid pne {{{")
    assert result.program is None
    assert any(d.severity == DiagnosticSeverity.ERROR for d in result.diagnostics)
    assert all(d.phase == "parse" for d in result.diagnostics)
