"""Shared helpers for BMv2 / Tofino P4 generation from FragmentIR instructions."""

from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from typing import Any

from compiler.backend.emit_context import EmitContext
from compiler.ir import FragmentIR, InstructionIR


def p4_safe_identifier(name: str) -> str:
    """Map arbitrary strings (e.g. topology node ids) to valid P4 identifiers."""
    s = re.sub(r"[^0-9a-zA-Z_]", "_", name.strip())
    if not s:
        return "_anon"
    if s[0].isdigit():
        return f"n_{s}"
    return s


def iter_fragments_in_plan_order(ctx: EmitContext) -> list[FragmentIR]:
    ordered = sorted(ctx.plan.fragments, key=lambda p: p.order)
    out: list[FragmentIR] = []
    for pl in ordered:
        fr = ctx.fragments_by_id.get(pl.fragment_id)
        if fr is not None:
            out.append(fr)
    return out


@dataclass(slots=True)
class ParsedCidr:
    """IPv4 CIDR for P4 LPM keys."""

    address: int
    """32-bit host-order value for network address (canonicalized)."""
    prefix_len: int


def parse_ipv4_cidr(value: str) -> ParsedCidr | None:
    """Parse strings like ``10.0.0.0/8``."""
    try:
        net = ipaddress.ip_network(value.strip(), strict=False)
    except ValueError:
        return None
    if net.version != 4:
        return None
    return ParsedCidr(
        address=int(net.network_address),
        prefix_len=int(net.prefixlen),
    )


def match_key_to_cidr(match: Any) -> str | None:
    """Extract CIDR string from intent_route_lookup ``match`` payload."""
    if not isinstance(match, dict):
        return None
    if match.get("kind") != "cidr":
        return None
    val = match.get("value")
    if not isinstance(val, str):
        return None
    return val


@dataclass(slots=True)
class RouteEntryModel:
    """One logical IPv4 LPM route for codegen."""

    route_name: str
    cidr: str
    destination: str
    via: Any
    protocol: str
    fragment_id: str


def destination_to_node_id(dest: Any) -> str:
    """Normalize intent ``to:`` payload to a stable string for port assignment."""
    if isinstance(dest, str):
        return dest
    if isinstance(dest, dict):
        if dest.get("kind") == "identifier" and dest.get("value") is not None:
            return str(dest["value"])
        v = dest.get("value")
        if v is not None:
            return str(v)
    return str(dest)


def collect_ipv4_route_entries(ctx: EmitContext) -> list[RouteEntryModel]:
    """
    Walk fragments in NodePlanIR order and collect ``intent_route_lookup`` for IP.

    Only IPv4-style protocols are lowered to LPM today (``ipv4`` / ``ip``).
    """
    routes: list[RouteEntryModel] = []
    for fr in iter_fragments_in_plan_order(ctx):
        for instr in fr.instructions:
            if instr.kind != "intent_route_lookup":
                continue
            proto = str(instr.data.get("protocol") or "").lower()
            if proto not in {"ipv4", "ip"}:
                continue
            cidr = match_key_to_cidr(instr.data.get("match"))
            if cidr is None:
                continue
            dest = instr.data.get("destination")
            dest_s = destination_to_node_id(dest)
            name = str(instr.data.get("name") or "route")
            routes.append(
                RouteEntryModel(
                    route_name=name,
                    cidr=cidr,
                    destination=dest_s,
                    via=instr.data.get("via"),
                    protocol=proto,
                    fragment_id=fr.id,
                )
            )
    return routes


def assign_egress_ports(routes: list[RouteEntryModel]) -> dict[str, int]:
    """Stable mapping from destination node id string to a BMv2/Tofino port number (1..511)."""
    dests = sorted({r.destination for r in routes})
    return {d: (i + 1) for i, d in enumerate(dests)}


def instruction_to_p4_comment(instr: InstructionIR) -> str:
    if instr.kind == "intent_policy":
        return f"// intent policy: {instr.data.get('name')}"
    if instr.kind in {"intent_determinism", "intent_schedule"}:
        return f"// intent {instr.kind}: {instr.data.get('name')}"
    return f"// {instr.kind}"


__all__ = [
    "ParsedCidr",
    "RouteEntryModel",
    "destination_to_node_id",
    "assign_egress_ports",
    "collect_ipv4_route_entries",
    "instruction_to_p4_comment",
    "iter_fragments_in_plan_order",
    "match_key_to_cidr",
    "parse_ipv4_cidr",
    "p4_safe_identifier",
]
