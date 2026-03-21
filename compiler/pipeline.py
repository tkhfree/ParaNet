"""End-to-end compile: PNE text + topology -> ProgramIR -> fragments -> NodePlan -> artifacts."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, replace
from hashlib import sha256
from pathlib import Path
from typing import Any

from compiler.backend.base import BackendEmitter
from compiler.backend.emit_context import EmitContext
from compiler.backend.factory import get_backend_emitter
from compiler.frontend import PneParser
from compiler.ir import FragmentIR, NodePlanIR, ProgramIR
from compiler.ir.common import Diagnostic, DiagnosticSeverity

# 与前端「编译阶段」及内部 pass 对齐的诊断阶段标识（不含预处理）
_DIAG_PHASE_PARSE = "parse"
_DIAG_PHASE_SEMANTIC = "semantic"


def _diagnostics_with_phase(diags: list[Diagnostic], phase: str) -> list[Diagnostic]:
    return [replace(d, phase=phase) if d.phase is None else d for d in diags]
from compiler.lowering.fragment_builder import build_fragments_from_program
from compiler.placement.planner import greedy_place
from compiler.semantic.collector_pne_intent import PNEIntentCollector


def _stable_hash_json(obj: Any) -> str:
    return sha256(json.dumps(obj, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:16]


def _program_ast_payload(parse_ast: Any) -> dict[str, Any]:
    """JSON-serializable wrapper for the PNE `ProgramNode` AST."""
    return {"type": "Program", "value": parse_ast.to_dict()}  # parse_ast: ProgramNode


@dataclass(slots=True)
class CompilePipelineResult:
    """Result of `compile_pipeline` (does not raise on semantic errors; check `diagnostics`)."""

    program: ProgramIR | None
    fragments: list[FragmentIR]
    node_plans: list[NodePlanIR]
    artifacts: dict[str, Any]
    diagnostics: list[Diagnostic] = field(default_factory=list)
    ast_payload: dict[str, Any] | None = None


def compile_pipeline(
    pne_text: str,
    *,
    topology_snapshot: dict[str, Any] | None = None,
    file_name: str = "<memory>",
    output_dir: Path | None = None,
    default_target: str = "bmv2",
    override_target: str | None = None,
    target: str | None = None,
) -> CompilePipelineResult:
    """
    Parse PNE, collect ProgramIR (with optional topology), build fragments, place, emit artifacts.

    **Per-node backends (one-big-switch):** each topology node may set
    ``capabilities.dataPlaneTarget`` (or ``dataPlaneTarget``) to ``bmv2`` / ``tofino`` / ``stub``.
    Missing metadata defaults to ``default_target``.

    If ``override_target`` is set (or legacy ``target``), **all** nodes use that backend
    (e.g. CLI ``--target``).

    On parse or semantic **ERROR**-severity diagnostics, returns partial result with empty fragments/plans.
    """
    if target is not None:
        override_target = target

    parser = PneParser()
    parse_result = parser.parse_text(pne_text, file_name=file_name)

    if parse_result.ast is None:
        return CompilePipelineResult(
            program=None,
            fragments=[],
            node_plans=[],
            artifacts={},
            diagnostics=_diagnostics_with_phase(list(parse_result.diagnostics), _DIAG_PHASE_PARSE),
            ast_payload=None,
        )

    ast_payload = _program_ast_payload(parse_result.ast)

    parse_errors = [d for d in parse_result.diagnostics if d.severity == DiagnosticSeverity.ERROR]
    if parse_errors:
        return CompilePipelineResult(
            program=None,
            fragments=[],
            node_plans=[],
            artifacts={},
            diagnostics=_diagnostics_with_phase(parse_errors, _DIAG_PHASE_PARSE),
            ast_payload=ast_payload,
        )

    collector = PNEIntentCollector()
    semantic_result = collector.collect(parse_result.ast, topology_snapshot=topology_snapshot)
    sem_errors = [d for d in semantic_result.diagnostics if d.severity == DiagnosticSeverity.ERROR]
    if sem_errors:
        return CompilePipelineResult(
            program=semantic_result.program,
            fragments=[],
            node_plans=[],
            artifacts={},
            diagnostics=_diagnostics_with_phase(list(semantic_result.diagnostics), _DIAG_PHASE_SEMANTIC),
            ast_payload=ast_payload,
        )

    program = semantic_result.program
    fragments = build_fragments_from_program(program)
    node_plans = greedy_place(
        fragments,
        program,
        default_backend=default_target,
        override_backend=override_target,
    )

    fragments_by_id = {f.id: f for f in fragments}

    artifacts: dict[str, Any]
    if output_dir is not None:
        artifacts = _write_artifacts(
            node_plans,
            output_dir,
            pne_text,
            topology_snapshot,
            fragments_by_id=fragments_by_id,
            program=program,
            default_target=default_target,
            override_target=override_target,
        )
    else:
        artifacts = {
            "compiler_version": "0.3",
            "targetMode": "per_node",
            "default_target": default_target,
            "override_target": override_target,
            "source_hash": sha256(pne_text.encode("utf-8")).hexdigest()[:16],
            "topology_hash": _stable_hash_json(topology_snapshot) if topology_snapshot else "",
            "nodes": [
                _emit_node_artifact(
                    plan,
                    fragments_by_id=fragments_by_id,
                    program=program,
                )
                for plan in node_plans
            ],
        }

    return CompilePipelineResult(
        program=program,
        fragments=fragments,
        node_plans=node_plans,
        artifacts=artifacts,
        diagnostics=_diagnostics_with_phase(list(semantic_result.diagnostics), _DIAG_PHASE_SEMANTIC),
        ast_payload=ast_payload,
    )


def _emit_node_artifact(
    plan: NodePlanIR,
    *,
    fragments_by_id: dict[str, FragmentIR],
    program: ProgramIR | None,
) -> dict[str, Any]:
    emitter = get_backend_emitter(plan.backend)
    ctx = EmitContext(plan=plan, fragments_by_id=fragments_by_id, program=program)
    return {
        "node_id": plan.node_id,
        "backend": plan.backend,
        "program_p4": emitter.emit(ctx),
        "entries": emitter.emit_entries(ctx),
    }


def _write_artifacts(
    node_plans: list[NodePlanIR],
    output_dir: Path,
    source_text: str,
    topology_snapshot: dict[str, Any] | None,
    *,
    fragments_by_id: dict[str, FragmentIR],
    program: ProgramIR | None,
    default_target: str,
    override_target: str | None,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    src_hash = sha256(source_text.encode("utf-8")).hexdigest()[:16]
    topo_hash = _stable_hash_json(topology_snapshot) if topology_snapshot else ""

    manifest_nodes: list[dict[str, Any]] = []
    for plan in node_plans:
        emitter = get_backend_emitter(plan.backend)
        sub = output_dir / plan.node_id
        sub.mkdir(parents=True, exist_ok=True)
        p4_path = sub / "program.p4"
        ent_path = sub / "entries.json"
        ctx = EmitContext(plan=plan, fragments_by_id=fragments_by_id, program=program)
        p4_path.write_text(emitter.emit(ctx), encoding="utf-8")
        ent_path.write_text(json.dumps(emitter.emit_entries(ctx), indent=2), encoding="utf-8")
        manifest_nodes.append(
            {
                "node_id": plan.node_id,
                "backend": plan.backend,
                "program_p4": str(p4_path.as_posix()),
                "entries_json": str(ent_path.as_posix()),
            }
        )

    manifest: dict[str, Any] = {
        "compiler_version": "0.3",
        "targetMode": "per_node",
        "default_target": default_target,
        "override_target": override_target,
        "source_hash": src_hash,
        "topology_hash": topo_hash,
        "nodes": manifest_nodes,
    }
    man_path = output_dir / "manifest.json"
    man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    manifest["manifest_path"] = str(man_path.as_posix())
    return manifest


__all__ = ["CompilePipelineResult", "compile_pipeline"]
