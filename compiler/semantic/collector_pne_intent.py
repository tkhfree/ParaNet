"""Collect explicit PNE declarations plus optional intent overlays into ProgramIR."""

from __future__ import annotations

from dataclasses import dataclass, field

from compiler.frontend.pne_ast import (
    AttrNode,
    DeterminismDefNode,
    IntentProgramNode,
    LinkDefNode,
    NetworkDefNode,
    NodeDefNode,
    PolicyDefNode,
    RouteDefNode,
    ScheduleDefNode,
)
from compiler.frontend.pne_ast import IntentOverlayNode, ProgramNode, TopLevelNode
from compiler.ir import ApplicationIR, InstructionIR, ModuleIR, ProgramIR, ServiceIR
from compiler.ir.common import Diagnostic, DiagnosticSeverity
from compiler.semantic.collector_pne import ProgramCollector
from compiler.semantic.protocol_adapters import (
    ensure_protocol_map,
    get_protocol_adapter,
    normalize_protocol_name,
    validate_protocol_headers,
)
from compiler.semantic.topology_validate import validate_topology_references


@dataclass(slots=True)
class OverlaySemanticResult:
    program: ProgramIR
    diagnostics: list[Diagnostic] = field(default_factory=list)


def _find_attr(attrs: list[AttrNode], key: str) -> AttrNode | None:
    for attr in attrs:
        if attr.key == key:
            return attr
    return None


def _attr_string_value(attr: AttrNode | None) -> str | None:
    if attr is None or attr.value is None:
        return None
    if hasattr(attr.value, "raw"):
        return str(attr.value.raw)
    if isinstance(attr.value, str):
        return attr.value
    return None


def _resolve_route_protocol_name(route: RouteDefNode) -> str | None:
    """`profile` overrides `protocol` when both are present."""
    profile = _attr_string_value(_find_attr(route.attrs, "profile"))
    proto = _attr_string_value(_find_attr(route.attrs, "protocol"))
    raw = profile if profile is not None else proto
    if raw is None:
        return None
    return normalize_protocol_name(raw)


def _resolve_policy_protocol_name(policy: PolicyDefNode) -> str | None:
    profile = _attr_string_value(_find_attr(policy.attrs, "profile"))
    proto = _attr_string_value(_find_attr(policy.attrs, "protocol"))
    raw = profile if profile is not None else proto
    if raw is None:
        return None
    return normalize_protocol_name(raw)


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

        if program.metadata.get("topology") is not None:
            diagnostics.extend(validate_topology_references(program))

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
            elif isinstance(decl, DeterminismDefNode):
                self._lower_determinism(module, decl)
            elif isinstance(decl, ScheduleDefNode):
                self._lower_schedule(module, decl)
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
        protocol_name = _resolve_route_protocol_name(route)

        if not protocol_name:
            diagnostics.append(
                Diagnostic(
                    code="INT202",
                    message=f"Route '{route.name or '<anonymous>'}' is missing protocol or profile",
                    severity=DiagnosticSeverity.ERROR,
                    span=route.span,
                )
            )
            return

        diagnostics.extend(validate_protocol_headers(protocol_name, program))
        adapter = get_protocol_adapter(protocol_name)

        validation = adapter.validate_route(route, program)
        diagnostics.extend(validation)
        if any(d.severity == DiagnosticSeverity.ERROR for d in validation):
            return

        route_map = ensure_protocol_map(module, adapter)
        try:
            lowered = adapter.lower_route(route, module)
        except (ValueError, RuntimeError) as exc:
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
        protocol_name = _resolve_policy_protocol_name(policy)
        data: dict = {
            "name": policy.name,
            "match": _serialize_intent_value(match_attr.value if match_attr else None),
            "action": _serialize_intent_value(action_attr.value if action_attr else None),
            "module": module.name,
        }
        if protocol_name is not None:
            data["protocol"] = protocol_name
        module.body.append(
            InstructionIR(
                kind="intent_policy",
                data=data,
                span=policy.span,
            )
        )

    def _lower_determinism(self, module: ModuleIR, node: DeterminismDefNode) -> None:
        payload = {attr.key: _serialize_intent_value(attr.value) for attr in node.attrs}
        module.body.append(
            InstructionIR(
                kind="intent_determinism",
                data={
                    "name": node.name,
                    "attrs": payload,
                    "module": module.name,
                },
                span=node.span,
            )
        )

    def _lower_schedule(self, module: ModuleIR, node: ScheduleDefNode) -> None:
        payload = {attr.key: _serialize_intent_value(attr.value) for attr in node.attrs}
        module.body.append(
            InstructionIR(
                kind="intent_schedule",
                data={
                    "name": node.name,
                    "attrs": payload,
                    "module": module.name,
                },
                span=node.span,
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
