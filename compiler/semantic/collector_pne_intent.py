"""Collect explicit PNE declarations plus optional intent overlays into ProgramIR."""

from __future__ import annotations

from dataclasses import dataclass, field

from compiler.frontend.intent_ast import (
    AttrNode,
    IntentProgramNode,
    LinkDefNode,
    NetworkDefNode,
    NodeDefNode,
    PolicyDefNode,
    RouteDefNode,
)
from compiler.frontend.pne_ast import IntentOverlayNode, ProgramNode, TopLevelNode
from compiler.ir import ApplicationIR, InstructionIR, ModuleIR, ProgramIR, ServiceIR
from compiler.ir.common import Diagnostic, DiagnosticSeverity
from compiler.semantic.collector_pne import ProgramCollector
from compiler.semantic.protocol_adapters import (
    ensure_protocol_map,
    get_protocol_adapter,
    validate_protocol_headers,
)


@dataclass(slots=True)
class OverlaySemanticResult:
    program: ProgramIR
    diagnostics: list[Diagnostic] = field(default_factory=list)


def _find_attr(attrs: list[AttrNode], key: str) -> AttrNode | None:
    for attr in attrs:
        if attr.key == key:
            return attr
    return None


def _find_or_create_overlay_module(program: ProgramIR) -> ModuleIR:
    if program.modules:
        return next(iter(program.modules.values()))

    # Seed a minimal parser header so the built-in `ip` adapter can validate
    # protocol headers even when the user provides intent-only inputs.
    module = ModuleIR(
        name="intent_overlay_module",
        parser_headers=[{"kind": "identifier", "name": "ipv4"}],
    )
    program.modules[module.name] = module
    return module


def _ensure_overlay_service_chain(program: ProgramIR) -> None:
    if not program.applications:
        program.applications["intent_overlay_app"] = ApplicationIR(name="intent_overlay_app")
    if not program.services:
        program.services["intent_overlay_service"] = ServiceIR(
            name="intent_overlay_service",
            application_chain=[next(iter(program.applications.keys()))],
        )


class PNEIntentCollector:
    """Collect a ProgramNode with both explicit PNE and optional intent overlays."""

    def collect(self, program_node: ProgramNode, *, topology_snapshot: dict | None = None) -> OverlaySemanticResult:
        explicit_program = ProgramNode(
            includes=list(program_node.includes),
            declarations=[
                decl for decl in program_node.declarations if not isinstance(decl, IntentOverlayNode)
            ],
        )

        base_result = ProgramCollector().collect(explicit_program)
        program = base_result.program
        diagnostics = list(base_result.diagnostics)
        if topology_snapshot is not None:
            program.metadata["topology"] = topology_snapshot

        overlays = [
            decl.intent_program
            for decl in program_node.declarations
            if isinstance(decl, IntentOverlayNode) and decl.intent_program is not None
        ]
        if not overlays:
            return OverlaySemanticResult(program=program, diagnostics=diagnostics)

        _ensure_overlay_service_chain(program)
        module = _find_or_create_overlay_module(program)

        for overlay in overlays:
            self._lower_overlay(program, module, overlay, diagnostics)

        return OverlaySemanticResult(program=program, diagnostics=diagnostics)

    def _lower_overlay(
        self,
        program: ProgramIR,
        module: ModuleIR,
        overlay: IntentProgramNode,
        diagnostics: list[Diagnostic],
    ) -> None:
        for decl in overlay.declarations:
            if isinstance(decl, RouteDefNode):
                self._lower_route(program, module, decl, diagnostics)
            elif isinstance(decl, PolicyDefNode):
                self._lower_policy(module, decl)
            elif isinstance(decl, NetworkDefNode):
                program.constants[f"intent.network.{decl.name}"] = "present"
            elif isinstance(decl, NodeDefNode):
                program.constants[f"intent.node.{decl.name}"] = decl.node_type or "node"
            elif isinstance(decl, LinkDefNode):
                program.constants[f"intent.link.{decl.name or 'anonymous'}"] = "present"

    def _lower_route(
        self,
        program: ProgramIR,
        module: ModuleIR,
        route: RouteDefNode,
        diagnostics: list[Diagnostic],
    ) -> None:
        protocol_attr = _find_attr(route.attrs, "protocol")
        protocol_name = None
        if protocol_attr is not None and hasattr(protocol_attr.value, "raw"):
            protocol_name = str(protocol_attr.value.raw)
        elif protocol_attr is not None and isinstance(protocol_attr.value, str):
            protocol_name = protocol_attr.value

        if not protocol_name:
            diagnostics.append(
                Diagnostic(
                    code="INT202",
                    message=f"Route '{route.name or '<anonymous>'}' is missing a protocol",
                    severity=DiagnosticSeverity.ERROR,
                    span=route.span,
                )
            )
            return

        diagnostics.extend(validate_protocol_headers(protocol_name, program))
        adapter = get_protocol_adapter(protocol_name)
        if adapter is None:
            return

        route_map = ensure_protocol_map(module, protocol_name)
        try:
            lowered = adapter.lower_route(route, module)
        except ValueError as exc:
            diagnostics.append(
                Diagnostic(
                    code="INT203",
                    message=str(exc),
                    severity=DiagnosticSeverity.ERROR,
                    span=route.span,
                )
            )
            return

        route_map.entries.extend(lowered.map_entries)
        module.body.extend(lowered.instructions)

    def _lower_policy(self, module: ModuleIR, policy: PolicyDefNode) -> None:
        match_attr = _find_attr(policy.attrs, "match")
        action_attr = _find_attr(policy.attrs, "action")
        module.body.append(
            InstructionIR(
                kind="intent_policy",
                data={
                    "name": policy.name,
                    "match": _serialize_intent_value(match_attr.value if match_attr else None),
                    "action": _serialize_intent_value(action_attr.value if action_attr else None),
                    "module": module.name,
                },
                span=policy.span,
            )
        )


def _serialize_intent_value(value: object) -> object:
    if value is None:
        return None
    if hasattr(value, "raw"):
        return value.raw
    if hasattr(value, "pairs"):
        return {pair.key: _serialize_intent_value(pair.value) for pair in value.pairs}
    if hasattr(value, "items"):
        return [_serialize_intent_value(item) for item in value.items]
    if hasattr(value, "nodes"):
        return list(value.nodes)
    if hasattr(value, "kind") and hasattr(value, "value"):
        return {"kind": value.kind, "value": _serialize_intent_value(value.value)}
    return value


__all__ = ["OverlaySemanticResult", "PNEIntentCollector"]

