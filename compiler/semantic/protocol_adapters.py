"""Protocol adapter registry for lowering intent overlays into ProgramIR."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from compiler.frontend.pne_ast import (
    AttrNode,
    EndpointSpecNode,
    ListValueNode,
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
    if isinstance(value, ListValueNode):
        return [_intent_value_to_python(item) for item in value.items]
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


@dataclass(slots=True)
class ProfileSpec:
    """Static metadata for a protocol/profile (for docs and tooling)."""

    name: str
    extends: str | None = None
    description: str = ""


class ProtocolAdapter(ABC):
    """Lower protocol-specific intent constructs into ProgramIR artifacts."""

    protocol_name: str

    @property
    def profile_spec(self) -> ProfileSpec | None:
        return None

    def route_map_name(self) -> str:
        """Logical route table name in ModuleIR.maps (stable across aliases)."""
        return f"{self.protocol_name}_route_table"

    @abstractmethod
    def required_header_roots(self) -> set[str]:
        raise NotImplementedError

    @abstractmethod
    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        raise NotImplementedError

    @abstractmethod
    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        raise NotImplementedError

    def validate_route(self, route: RouteDefNode, program: ProgramIR) -> list[Diagnostic]:
        """Optional semantic checks before lowering."""
        return []

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


def _constraints_dict(route: RouteDefNode) -> dict[str, Any] | None:
    c = _find_attr(route.attrs, "constraints")
    if c is None or c.value is None:
        return None
    return _intent_value_to_python(c.value)  # type: ignore[return-value]


class IPv4ProtocolAdapter(ProtocolAdapter):
    """IPv4 LPM-style reachability (canonical name: ipv4)."""

    protocol_name = "ipv4"

    @property
    def profile_spec(self) -> ProfileSpec:
        return ProfileSpec(name="ipv4", description="IPv4 prefix routing")

    def route_map_name(self) -> str:
        # Preserve legacy table name used by existing tests and programs.
        return "ip_route_table"

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
            raise ValueError('IPv4 prefix requires prefix({ kind: "cidr", value: "x/y" })')
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
        map_name = self.route_map_name()
        constraints = _constraints_dict(route)

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
                        "constraints": constraints,
                    },
                    span=route.span,
                )
            ],
        )


class IPv6ProtocolAdapter(ProtocolAdapter):
    """IPv6 LPM-style reachability."""

    protocol_name = "ipv6"

    @property
    def profile_spec(self) -> ProfileSpec:
        return ProfileSpec(name="ipv6", description="IPv6 prefix routing")

    def required_header_roots(self) -> set[str]:
        return {"ipv6"}

    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        payload = prefix.value
        if not isinstance(payload, ObjectValueNode):
            raise ValueError("IPv6 prefix must be an object payload")

        raw = {pair.key: _intent_value_to_python(pair.value) for pair in payload.pairs}
        kind = raw.get("kind")
        value = raw.get("value")
        if kind != "cidr" or not isinstance(value, str):
            raise ValueError('IPv6 prefix requires prefix({ kind: "cidr", value: "x/y" })')
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
        map_name = self.route_map_name()
        constraints = _constraints_dict(route)

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
                        "constraints": constraints,
                    },
                    span=route.span,
                )
            ],
        )


class SRv6ProtocolAdapter(IPv6ProtocolAdapter):
    """Segment Routing over IPv6 (SRH semantics; requires IPv6 parser roots)."""

    protocol_name = "srv6"

    @property
    def profile_spec(self) -> ProfileSpec:
        return ProfileSpec(name="srv6", extends="ipv6", description="SRv6 segment routing")

    def required_header_roots(self) -> set[str]:
        return {"ipv6", "srv6"}

    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        from_attr = _find_attr(route.attrs, "from")
        to_attr = _find_attr(route.attrs, "to")
        via_attr = _find_attr(route.attrs, "via")
        path_attr = _find_attr(route.attrs, "path")

        if not isinstance(from_attr.value if from_attr else None, EndpointSpecNode):
            raise ValueError("route.from must be an endpoint spec")

        prefix_key = self.prefix_to_match_key(from_attr.value)
        destination = _intent_value_to_python(to_attr.value if to_attr else None)
        via_nodes = _intent_value_to_python(via_attr.value if via_attr else None)
        path_val = _intent_value_to_python(path_attr.value if path_attr else None)
        map_name = self.route_map_name()
        constraints = _constraints_dict(route)

        return LoweredRoute(
            map_entries=[[prefix_key, destination, via_nodes, path_val]],
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
                        "path": path_val,
                        "module": module.name,
                        "constraints": constraints,
                    },
                    span=route.span,
                )
            ],
        )


class CustomProtocolAdapter(ProtocolAdapter):
    """
    Generic adapter for protocols using prefix({ kind, value }) style keys.

    Used for registered profiles like ndn/geo and as a fallback for unknown names.
    """

    def __init__(self, protocol_name: str):
        self.protocol_name = protocol_name

    def required_header_roots(self) -> set[str]:
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
        map_name = self.route_map_name()
        constraints = _constraints_dict(route)

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
                        "constraints": constraints,
                    },
                    span=route.span,
                )
            ],
        )


class PowerlinkProtocolAdapter(ProtocolAdapter):
    """Industrial real-time: routes are not used; prefer determinism/schedule blocks."""

    protocol_name = "powerlink"

    @property
    def profile_spec(self) -> ProfileSpec:
        return ProfileSpec(name="powerlink", description="Powerlink / cyclic deterministic networking")

    def required_header_roots(self) -> set[str]:
        return set()

    def validate_route(self, route: RouteDefNode, program: ProgramIR) -> list[Diagnostic]:
        return [
            Diagnostic(
                code="INT204",
                message=(
                    "Profile 'powerlink' does not use L3 route intents; "
                    "use 'determinism' / 'schedule' blocks instead"
                ),
                severity=DiagnosticSeverity.ERROR,
                span=route.span,
            )
        ]

    def prefix_to_match_key(self, prefix: EndpointSpecNode) -> object:
        raise ValueError("powerlink routes are not supported")

    def lower_route(self, route: RouteDefNode, module: ModuleIR) -> LoweredRoute:
        raise RuntimeError("powerlink routes should not be lowered")


# Canonical profile name -> alias list (surface syntax / legacy)
PROFILE_ALIASES: dict[str, tuple[str, ...]] = {
    "ipv4": ("ip",),
}

_CANONICAL_BY_ALIAS: dict[str, str] = {}
for _canonical, _aliases in PROFILE_ALIASES.items():
    for _a in _aliases:
        _CANONICAL_BY_ALIAS[_a] = _canonical


def normalize_protocol_name(name: str) -> str:
    """Map alias (e.g. ip) to canonical profile id (ipv4)."""
    key = name.strip().lower()
    return _CANONICAL_BY_ALIAS.get(key, key)


_REGISTRY: dict[str, ProtocolAdapter] = {}
_PROFILE_SPECS: dict[str, ProfileSpec] = {}


def _register_defaults() -> None:
    ipv4 = IPv4ProtocolAdapter()
    _REGISTRY["ipv4"] = ipv4
    _REGISTRY["ip"] = ipv4
    _PROFILE_SPECS["ipv4"] = ipv4.profile_spec  # type: ignore[assignment]

    ipv6 = IPv6ProtocolAdapter()
    _REGISTRY["ipv6"] = ipv6
    if ipv6.profile_spec:
        _PROFILE_SPECS["ipv6"] = ipv6.profile_spec

    srv6 = SRv6ProtocolAdapter()
    _REGISTRY["srv6"] = srv6
    if srv6.profile_spec:
        _PROFILE_SPECS["srv6"] = srv6.profile_spec

    for name in ("ndn", "geo"):
        adapter = CustomProtocolAdapter(name)
        _REGISTRY[name] = adapter

    pl = PowerlinkProtocolAdapter()
    _REGISTRY["powerlink"] = pl
    if pl.profile_spec:
        _PROFILE_SPECS["powerlink"] = pl.profile_spec


_register_defaults()


def register_protocol_adapter(adapter: ProtocolAdapter) -> None:
    _REGISTRY[adapter.protocol_name] = adapter
    spec = adapter.profile_spec
    if spec is not None:
        _PROFILE_SPECS[adapter.protocol_name] = spec


def get_protocol_adapter(protocol_name: str) -> ProtocolAdapter:
    key = normalize_protocol_name(protocol_name)
    adapter = _REGISTRY.get(key)
    if adapter is not None:
        return adapter
    # Fallback: treat unknown protocols as custom protocols.
    return CustomProtocolAdapter(key)


def list_profile_specs() -> dict[str, ProfileSpec]:
    return dict(_PROFILE_SPECS)


def validate_protocol_headers(protocol_name: str, program: ProgramIR) -> list[Diagnostic]:
    key = normalize_protocol_name(protocol_name)
    adapter = _REGISTRY.get(key)
    if adapter is None:
        adapter = CustomProtocolAdapter(key)

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
            message=f"Protocol '{key}' requires parser headers rooted at one of: {headers}",
            severity=DiagnosticSeverity.ERROR,
        )
    ]


def ensure_protocol_map(module: ModuleIR, adapter: ProtocolAdapter) -> MapDeclIR:
    map_name = adapter.route_map_name()
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


__all__ = [
    "CustomProtocolAdapter",
    "IPv4ProtocolAdapter",
    "IPv6ProtocolAdapter",
    "LoweredRoute",
    "PowerlinkProtocolAdapter",
    "ProfileSpec",
    "ProtocolAdapter",
    "SRv6ProtocolAdapter",
    "ensure_protocol_map",
    "get_protocol_adapter",
    "list_profile_specs",
    "normalize_protocol_name",
    "parser_header_roots",
    "register_protocol_adapter",
    "validate_protocol_headers",
]
