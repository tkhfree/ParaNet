"""Protocol adapter registry for lowering intent overlays into ProgramIR."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from compiler.frontend.pne_ast import (
    AttrNode,
    EndpointSpecNode,
    ObjectValueNode,
    PolicyDefNode,
    RouteDefNode,
    ValueNode,
    ViaSpecNode,
)
from compiler.ir import InstructionIR, MapDeclIR, ModuleIR, ProgramIR, TypeRef
from compiler.ir.common import Diagnostic, DiagnosticSeverity


def _find_attr(attrs: list[AttrNode], key: str) -> AttrNode | None:
    for attr in attrs:
        if attr.key == key:
            return attr
    return None


def _intent_value_to_python(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, ValueNode):
        return value.raw
    if isinstance(value, EndpointSpecNode):
        return {
            "kind": value.kind,
            "value": _intent_value_to_python(value.value),
        }
    if isinstance(value, ObjectValueNode):
        return {pair.key: _intent_value_to_python(pair.value) for pair in value.pairs}
    if isinstance(value, ViaSpecNode):
        return list(value.nodes)
    if hasattr(value, "pairs"):
        return {pair.key: _intent_value_to_python(pair.value) for pair in value.pairs}
    if hasattr(value, "items"):
        return [_intent_value_to_python(item) for item in value.items]
    return value


def parser_header_roots(program: ProgramIR) -> set[str]:
    roots: set[str] = set()
    for module in program.modules.values():
        for header in module.parser_headers:
            # Current PNE parser stores headers as AST expressions (e.g. IdentifierNode),
            # not as dicts. Support both representations.
            if isinstance(header, dict):
                kind = header.get("kind")
                if kind == "identifier":
                    name = header.get("name")
                    if isinstance(name, str):
                        roots.add(name)
                elif kind == "field":
                    parts = header.get("parts")
                    if isinstance(parts, list) and parts:
                        if parts[0] == "hdr" and len(parts) > 1:
                            roots.add(str(parts[1]))
                        else:
                            roots.add(str(parts[0]))
                continue

            # Heuristic for PNE AST nodes: IdentifierNode has `name`,
            # FieldAccessNode has `parts`.
            name = getattr(header, "name", None)
            if isinstance(name, str):
                roots.add(name)
                continue

            parts = getattr(header, "parts", None)
            if isinstance(parts, list) and parts:
                if parts[0] == "hdr" and len(parts) > 1:
                    roots.add(str(parts[1]))
                else:
                    roots.add(str(parts[0]))
    return roots


@dataclass(slots=True)
class LoweredRoute:
    map_entries: list[list[object]]
    instructions: list[InstructionIR]


class ProtocolAdapter(ABC):
    """Lower protocol-specific intent constructs into ProgramIR artifacts."""

    protocol_name: str

    @abstractmethod
    def required_header_roots(self) -> set[str]:
        raise NotImplementedError

    @abstractmethod
    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        raise NotImplementedError

    @abstractmethod
    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        raise NotImplementedError

    def lower_policy(self, policy: PolicyDefNode, module: ModuleIR) -> list[InstructionIR]:
        match_attr = _find_attr(policy.attrs, "match")
        action_attr = _find_attr(policy.attrs, "action")
        return [
            InstructionIR(
                kind="intent_policy",
                data={
                    "name": policy.name,
                    "protocol": self.protocol_name,
                    "match": _intent_value_to_python(match_attr.value if match_attr else None),
                    "action": _intent_value_to_python(action_attr.value if action_attr else None),
                    "module": module.name,
                },
                span=policy.span,
            )
        ]


class IPProtocolAdapter(ProtocolAdapter):
    protocol_name = "ip"

    def required_header_roots(self) -> set[str]:
        return {"ip", "ipv4"}

    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        payload = prefix.value
        if not isinstance(payload, ObjectValueNode):
            raise ValueError("IP prefix must be an object payload")

        raw = {pair.key: _intent_value_to_python(pair.value) for pair in payload.pairs}
        kind = raw.get("kind")
        value = raw.get("value")
        if kind != "cidr" or not isinstance(value, str):
            raise ValueError("IP prefix requires prefix({ kind: \"cidr\", value: \"x/y\" })")
        return {"kind": kind, "value": value}

    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        from_attr = _find_attr(route.attrs, "from")
        to_attr = _find_attr(route.attrs, "to")
        via_attr = _find_attr(route.attrs, "via")

        if not isinstance(from_attr.value if from_attr else None, EndpointSpecNode):
            raise ValueError("route.from must be an endpoint spec")

        prefix_key = self.prefix_to_match_key(from_attr.value)
        destination = _intent_value_to_python(to_attr.value if to_attr else None)
        via_nodes = _intent_value_to_python(via_attr.value if via_attr else None)
        map_name = f"{self.protocol_name}_route_table"

        return LoweredRoute(
            map_entries=[[prefix_key, destination, via_nodes]],
            instructions=[
                InstructionIR(
                    kind="intent_route_lookup",
                    data={
                        "name": route.name,
                        "protocol": self.protocol_name,
                        "map": map_name,
                        "match": prefix_key,
                        "destination": destination,
                        "via": via_nodes,
                        "module": module.name,
                    },
                    span=route.span,
                )
            ],
        )


class CustomProtocolAdapter(ProtocolAdapter):
    """
    Generic adapter for non-IP protocols.

    First implementation is intentionally conservative: it mainly encodes intent
    routes into ProgramIR artifacts and does not enforce detailed header/field
    presence (so custom protocols can be prototyped end-to-end).
    """

    def __init__(self, protocol_name: str):
        self.protocol_name = protocol_name

    def required_header_roots(self) -> set[str]:
        # For now, allow custom protocols even if we cannot precisely validate
        # header roots without a full adapter->parser-field spec.
        return set()

    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        payload = prefix.value
        if not isinstance(payload, ObjectValueNode):
            raise ValueError(f"{self.protocol_name} prefix must be an object payload")

        raw = {pair.key: _intent_value_to_python(pair.value) for pair in payload.pairs}
        kind = raw.get("kind")
        value = raw.get("value")
        if not isinstance(kind, str) or not isinstance(value, str):
            raise ValueError(
                f"{self.protocol_name} prefix requires prefix({{ kind: <string>, value: <string> }})"
            )
        return {"kind": kind, "value": value, "protocol": self.protocol_name}

    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        from_attr = _find_attr(route.attrs, "from")
        to_attr = _find_attr(route.attrs, "to")
        via_attr = _find_attr(route.attrs, "via")

        if not isinstance(from_attr.value if from_attr else None, EndpointSpecNode):
            raise ValueError("route.from must be an endpoint spec")

        prefix_key = self.prefix_to_match_key(from_attr.value)
        destination = _intent_value_to_python(to_attr.value if to_attr else None)
        via_nodes = _intent_value_to_python(via_attr.value if via_attr else None)
        map_name = f"{self.protocol_name}_route_table"

        return LoweredRoute(
            map_entries=[[prefix_key, destination, via_nodes]],
            instructions=[
                InstructionIR(
                    kind="intent_route_lookup",
                    data={
                        "name": route.name,
                        "protocol": self.protocol_name,
                        "map": map_name,
                        "match": prefix_key,
                        "destination": destination,
                        "via": via_nodes,
                        "module": module.name,
                    },
                    span=route.span,
                )
            ],
        )


_REGISTRY: dict[str, ProtocolAdapter] = {
    "ip": IPProtocolAdapter(),
}


def register_protocol_adapter(adapter: ProtocolAdapter) -> None:
    _REGISTRY[adapter.protocol_name] = adapter


def get_protocol_adapter(protocol_name: str) -> ProtocolAdapter | None:
    adapter = _REGISTRY.get(protocol_name)
    if adapter is not None:
        return adapter
    # Fallback: treat unknown protocols as custom protocols.
    return CustomProtocolAdapter(protocol_name)


def validate_protocol_headers(protocol_name: str, program: ProgramIR) -> list[Diagnostic]:
    adapter = get_protocol_adapter(protocol_name)
    if adapter is None:
        return [
            Diagnostic(
                code="INT200",
                message=f"Unsupported protocol adapter: {protocol_name}",
                severity=DiagnosticSeverity.ERROR,
            )
        ]

    required = adapter.required_header_roots()
    if not required:
        return []

    present = parser_header_roots(program)
    if required.intersection(present):
        return []

    headers = ", ".join(sorted(required))
    return [
        Diagnostic(
            code="INT201",
            message=f"Protocol '{protocol_name}' requires parser headers rooted at one of: {headers}",
            severity=DiagnosticSeverity.ERROR,
        )
    ]


def ensure_protocol_map(module: ModuleIR, protocol_name: str) -> MapDeclIR:
    map_name = f"{protocol_name}_route_table"
    existing = module.maps.get(map_name)
    if existing is not None:
        return existing

    route_map = MapDeclIR(
        name=map_name,
        key_types=[TypeRef(name="prefix")],
        value_types=[TypeRef(name="destination"), TypeRef(name="via_path")],
        size=1024,
    )
    module.maps[map_name] = route_map
    return route_map

