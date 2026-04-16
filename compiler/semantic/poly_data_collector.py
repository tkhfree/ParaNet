"""Collect Data IR from Polymorphic DSL AST + TopologyIR, with device partitioning."""

from __future__ import annotations

import re
from typing import Any

from compiler.frontend.poly_ast import (
    DataBlockNode,
    HeaderFieldNode,
    ModuleDefNode,
    PacketDefNode,
    ParseDefNode,
    ParseMatchCaseNode,
    PolyAstNode,
    PolyValueNode,
    ServiceDefNode,
)
from compiler.ir.poly_data_ir import (
    DataIR,
    DeviceP4Program,
    FieldIR,
    MatchCaseIR,
    MatchKeyIR,
    ModuleIR,
    PacketIR,
    ParserIR,
    ServiceIR,
)
from compiler.ir.poly_topology_ir import TopologyIR


# ---------------------------------------------------------------------------
# Type resolution: DSL → P4_16
# ---------------------------------------------------------------------------

_P4_TYPE_MAP: dict[str, str] = {
    "mac_addr": "bit<48>",
    "ipv4_addr": "bit<32>",
    "ipv6_addr": "bit<128>",
    "uint8": "bit<8>",
    "uint16": "bit<16>",
    "uint32": "bit<32>",
    "uint64": "bit<64>",
    "int8": "int<8>",
    "int16": "int<16>",
    "int32": "int<32>",
    "bool": "bit<1>",
}

_TNA_TYPE_OVERRIDES: dict[str, str] = {
    "port_t": "PortId_t",
}


def _resolve_p4_type(dsl_type: str, arch: str = "v1model") -> str:
    """Resolve a DSL type reference to a P4_16 type string."""
    dsl_type = dsl_type.strip()

    # TNA-specific overrides
    if arch == "tna" and dsl_type in _TNA_TYPE_OVERRIDES:
        return _TNA_TYPE_OVERRIDES[dsl_type]

    # Exact match in map
    if dsl_type.lower() in _P4_TYPE_MAP:
        return _P4_TYPE_MAP[dsl_type.lower()]

    # bitN → bit<N>
    m = re.match(r"bit(\d+)$", dsl_type, re.IGNORECASE)
    if m:
        return f"bit<{m.group(1)}>"

    # intN → int<N>
    m = re.match(r"int(\d+)$", dsl_type, re.IGNORECASE)
    if m:
        return f"int<{m.group(1)}>"

    # uint(N) → bit<N>
    m = re.match(r"uint\s*\(\s*(\d+)\s*\)$", dsl_type, re.IGNORECASE)
    if m:
        return f"bit<{m.group(1)}>"

    # port_t defaults for v1model
    if dsl_type == "port_t":
        return "bit<9>"

    # Pass through unknown types (e.g., user-defined types)
    return dsl_type


# ---------------------------------------------------------------------------
# When-clause parsing → MatchKeyIR
# ---------------------------------------------------------------------------

def _parse_when_clause(when_str: str) -> list[MatchKeyIR]:
    """Extract match keys from a module when-clause expression.

    Best-effort regex extraction. Supports:
      - field == value → exact
      - field != value → ternary
      - field matches value → ternary
    Conjunctions with && are split.
    """
    if not when_str:
        return []

    keys: list[MatchKeyIR] = []
    parts = re.split(r"\s*&&\s*", when_str)

    for part in parts:
        part = part.strip()
        # field != value → ternary
        m = re.match(r"([\w.]+)\s*!=\s*(.+)$", part)
        if m:
            keys.append(MatchKeyIR(field_name=m.group(1), match_kind="ternary"))
            continue
        # field == value → exact
        m = re.match(r"([\w.]+)\s*==\s*(.+)$", part)
        if m:
            keys.append(MatchKeyIR(field_name=m.group(1), match_kind="exact"))
            continue
        # field matches value → ternary
        m = re.match(r"([\w.]+)\s+matches\s+(.+)$", part)
        if m:
            keys.append(MatchKeyIR(field_name=m.group(1), match_kind="ternary"))
            continue
        # bare field name → ternary (non-zero check)
        m = re.match(r"([\w.]+)\s*$", part)
        if m:
            keys.append(MatchKeyIR(field_name=m.group(1), match_kind="exact"))

    return keys


# ---------------------------------------------------------------------------
# AST → IR collection helpers
# ---------------------------------------------------------------------------

def _val(node: PolyAstNode | None, default: Any = "") -> Any:
    """Extract raw value from a PolyValueNode."""
    if isinstance(node, PolyValueNode):
        return node.raw
    return default


def _collect_fields(field_nodes: list[HeaderFieldNode], arch: str) -> list[FieldIR]:
    """Transform HeaderFieldNode list to FieldIR list."""
    fields: list[FieldIR] = []
    for f in field_nodes:
        p4_type = _resolve_p4_type(f.type_ref, arch)
        fields.append(FieldIR(name=f.name, type_ref=f.type_ref, p4_type=p4_type))
    return fields


def _collect_packets(packet_nodes: list[PacketDefNode], arch: str) -> list[PacketIR]:
    """Transform PacketDefNode list to PacketIR list."""
    packets: list[PacketIR] = []
    for pkt in packet_nodes:
        packets.append(PacketIR(
            name=pkt.name,
            header_fields=_collect_fields(pkt.header_fields, arch),
            metadata_fields=_collect_fields(pkt.metadata_fields, arch),
        ))
    return packets


def _collect_parsers(parse_nodes: list[ParseDefNode]) -> list[ParserIR]:
    """Transform ParseDefNode list to ParserIR list."""
    parsers: list[ParserIR] = []
    for p in parse_nodes:
        cases = [
            MatchCaseIR(match_value=c.match_value, action=c.action)
            for c in p.match_cases
        ]
        parsers.append(ParserIR(
            name=p.name,
            packet_ref=p.packet_ref,
            extracts=list(p.extracts),
            match_cases=cases,
            default_action=p.default_action or "accept",
        ))
    return parsers


def _collect_modules(module_nodes: list[ModuleDefNode]) -> list[ModuleIR]:
    """Transform ModuleDefNode list to ModuleIR list."""
    modules: list[ModuleIR] = []
    for mod in module_nodes:
        constraints = {
            k: str(_val(v, str(v))) for k, v in mod.constraints.items()
        }
        match_keys = _parse_when_clause(mod.when_clause)
        name = mod.name
        modules.append(ModuleIR(
            name=name,
            packet_ref=mod.packet_ref,
            when_clause=mod.when_clause,
            action_clause=mod.action_clause,
            constraints=constraints,
            match_keys=match_keys,
            table_name=f"tbl_{name}",
            action_name=f"act_{name}",
        ))
    return modules


def _collect_services(service_nodes: list[ServiceDefNode]) -> list[ServiceIR]:
    """Transform ServiceDefNode list to ServiceIR list."""
    services: list[ServiceIR] = []
    for svc in service_nodes:
        services.append(ServiceIR(
            name=svc.name,
            applies=list(svc.applies),
            target_role=svc.target_role,
            pipeline=svc.pipeline or "ingress",
            constraints=list(svc.constraints),
        ))
    return services


# ---------------------------------------------------------------------------
# Device partitioning
# ---------------------------------------------------------------------------

# P4-capable targets
_P4_TARGETS = {"p4", "bmv2", "tofino"}


def _get_node_role(topo_node) -> str:
    """Get the DSL role name for a topology node.

    Maps back from node type (e.g., "switch") to role names that may appear
    in service.applies lists (e.g., "spine", "leaf").
    """
    # The node properties may store the original profile role
    props = topo_node.properties
    # If the node name contains role info, use it
    name = topo_node.name.lower()
    node_type = topo_node.type

    # Direct type match
    if node_type in ("spine", "leaf"):
        return node_type

    # Check if name starts with a known role
    for role in ("spine", "leaf", "router", "host", "endpoint", "controller"):
        if name.startswith(role):
            return role

    return node_type


def _partition_modules_to_devices(
    services: list[ServiceIR],
    modules: list[ModuleIR],
    topo_ir: TopologyIR,
    packets: list[PacketIR],
    parsers: list[ParserIR],
    includes: list[str],
) -> list[DeviceP4Program]:
    """Partition modules across P4-capable devices based on service placement."""
    # Build device info from topology
    devices: list[dict[str, Any]] = []
    for node in topo_ir.nodes:
        profile_name = node.properties.get("profile", "")
        profile_info = topo_ir.profiles.get(profile_name, {})
        target = profile_info.get("target", "")

        # Normalize target
        target_lower = target.lower()
        if target_lower not in _P4_TARGETS:
            continue

        pipeline = profile_info.get("pipeline", "v1model")
        if pipeline in ("tna", "tofino"):
            arch = "tna"
        else:
            arch = "v1model"

        # Determine actual target string
        if target_lower == "tofino":
            p4_target = "tofino"
        else:
            p4_target = "bmv2"

        role = _get_node_role(node)

        devices.append({
            "id": node.id,
            "name": node.name,
            "role": role,
            "arch": arch,
            "target": p4_target,
        })

    # For each device, determine which modules apply
    programs: list[DeviceP4Program] = []
    packet_map = {p.name: p for p in packets}
    parser_by_packet = {p.packet_ref: p for p in parsers}

    for dev in devices:
        assigned_modules: list[ModuleIR] = []
        assigned_services: list[ServiceIR] = []

        for svc in services:
            # Check if this device's role matches service.applies
            if dev["role"] in svc.applies or "switch" in svc.applies and dev["role"] in ("spine", "leaf", "switch"):
                assigned_services.append(svc)
                # Assign modules whose target_role matches
                for mod in modules:
                    if mod not in assigned_modules:
                        assigned_modules.append(mod)

        if not assigned_modules:
            continue

        # Collect referenced packets
        ref_packet_names = {m.packet_ref for m in assigned_modules}
        dev_packets = [packet_map[n] for n in ref_packet_names if n in packet_map]

        # Collect referenced parsers
        dev_parsers: list[ParserIR] = []
        seen_parsers: set[str] = set()
        for pkt_name in ref_packet_names:
            if pkt_name in parser_by_packet and parser_by_packet[pkt_name].name not in seen_parsers:
                dev_parsers.append(parser_by_packet[pkt_name])
                seen_parsers.add(parser_by_packet[pkt_name].name)

        programs.append(DeviceP4Program(
            device_id=dev["id"],
            device_name=dev["name"],
            p4_arch=dev["arch"],
            p4_target=dev["target"],
            modules=assigned_modules,
            services=assigned_services,
            packets=dev_packets,
            parsers=dev_parsers,
            includes=list(includes),
        ))

    return programs


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

def collect_data(
    data_block: DataBlockNode,
    topo_ir: TopologyIR,
    protocol_name: str = "",
) -> DataIR:
    """Collect DataIR from a DataBlockNode AST + TopologyIR.

    1. Transform AST nodes to IR (packets, parsers, modules, services)
    2. Partition modules to devices based on service placement
    3. Return DataIR with per-device programs
    """
    # Use v1model as default arch for type resolution (device-specific overrides happen per-device)
    default_arch = "v1model"
    packets = _collect_packets(data_block.packets, default_arch)
    parsers = _collect_parsers(data_block.parsers)
    modules = _collect_modules(data_block.modules)
    services = _collect_services(data_block.services)
    includes = list(data_block.includes)

    device_programs = _partition_modules_to_devices(
        services, modules, topo_ir, packets, parsers, includes,
    )

    return DataIR(
        protocol_name=protocol_name,
        device_programs=device_programs,
        packets=packets,
        parsers=parsers,
        modules=modules,
        services=services,
        includes=includes,
    )


__all__ = [
    "collect_data",
    "_resolve_p4_type",
    "_parse_when_clause",
]
