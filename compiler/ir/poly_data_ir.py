"""Data IR for the Polymorphic DSL — per-device P4 program model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import SerializableModel


@dataclass(slots=True)
class FieldIR(SerializableModel):
    """Packet header or metadata field with resolved P4 type."""

    name: str = ""
    type_ref: str = ""   # DSL type ("mac_addr", "bit16", "uint32")
    p4_type: str = ""    # resolved P4 type ("bit<48>", "bit<16>", "bit<32>")


@dataclass(slots=True)
class PacketIR(SerializableModel):
    """Resolved packet structure."""

    name: str = ""
    header_fields: list[FieldIR] = field(default_factory=list)
    metadata_fields: list[FieldIR] = field(default_factory=list)


@dataclass(slots=True)
class MatchCaseIR(SerializableModel):
    """Single parser match case."""

    match_value: str = ""
    action: str = ""     # "extract X" or "drop" or "accept"


@dataclass(slots=True)
class ParserIR(SerializableModel):
    """Resolved parser definition."""

    name: str = ""
    packet_ref: str = ""
    extracts: list[str] = field(default_factory=list)
    match_cases: list[MatchCaseIR] = field(default_factory=list)
    default_action: str = "accept"


@dataclass(slots=True)
class MatchKeyIR(SerializableModel):
    """P4 table match key extracted from module when-clause."""

    field_name: str = ""
    match_kind: str = "exact"   # "exact", "ternary", "lpm"


@dataclass(slots=True)
class ModuleIR(SerializableModel):
    """Resolved processing module with P4 table/action names."""

    name: str = ""
    packet_ref: str = ""
    when_clause: str = ""
    action_clause: str = ""
    constraints: dict[str, str] = field(default_factory=dict)
    match_keys: list[MatchKeyIR] = field(default_factory=list)
    table_name: str = ""       # derived: "tbl_{name}"
    action_name: str = ""      # derived: "act_{name}"


@dataclass(slots=True)
class ServiceIR(SerializableModel):
    """Resolved service placement specification."""

    name: str = ""
    applies: list[str] = field(default_factory=list)  # device roles
    target_role: str = ""
    pipeline: str = "ingress"   # "ingress" | "egress"
    constraints: list[str] = field(default_factory=list)


@dataclass(slots=True)
class DeviceP4Program(SerializableModel):
    """Per-device P4 program with assigned modules and dependencies."""

    device_id: str = ""
    device_name: str = ""
    p4_arch: str = "v1model"    # "v1model" | "tna"
    p4_target: str = "bmv2"     # "bmv2" | "tofino"
    modules: list[ModuleIR] = field(default_factory=list)
    services: list[ServiceIR] = field(default_factory=list)
    packets: list[PacketIR] = field(default_factory=list)
    parsers: list[ParserIR] = field(default_factory=list)
    includes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class DataIR(SerializableModel):
    """Root data plane IR containing shared definitions and per-device programs."""

    protocol_name: str = ""
    device_programs: list[DeviceP4Program] = field(default_factory=list)
    packets: list[PacketIR] = field(default_factory=list)
    parsers: list[ParserIR] = field(default_factory=list)
    modules: list[ModuleIR] = field(default_factory=list)
    services: list[ServiceIR] = field(default_factory=list)
    includes: list[str] = field(default_factory=list)
