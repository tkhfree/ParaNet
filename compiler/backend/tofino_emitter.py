"""Tofino TNA P4 emitter: same IPv4 LPM semantics as BMv2, TNA control/parser shape.

Requires Intel P4 Studio / Barefoot SDE ``tna.p4`` and intrinsic metadata types.
"""

from __future__ import annotations

from typing import Any

from compiler.backend.base import BackendEmitter
from compiler.backend.emit_context import EmitContext
from compiler.backend.p4_codegen import (
    assign_egress_ports,
    collect_ipv4_route_entries,
    instruction_to_p4_comment,
    iter_fragments_in_plan_order,
    parse_ipv4_cidr,
    p4_safe_identifier,
)


class TofinoEmitter(BackendEmitter):
    """Emit TNA-shaped ingress parser + control (attach to your SDE Pipeline)."""

    def emit(self, ctx: EmitContext) -> str:
        routes = collect_ipv4_route_entries(ctx)
        assign_egress_ports(routes)
        node_id = p4_safe_identifier(ctx.plan.node_id)

        frag_lines: list[str] = []
        for fr in iter_fragments_in_plan_order(ctx):
            frag_lines.append(f"        // --- fragment {fr.id} ---")
            for instr in fr.instructions:
                frag_lines.append(f"        {instruction_to_p4_comment(instr)}")
        fragment_block = "\n".join(frag_lines) if frag_lines else "        // (no fragments)"

        lines: list[str] = [
            "/*",
            f" * ParaNet — Tofino TNA ingress for node `{ctx.plan.node_id}`",
            " * Requires Intel P4 Studio / Barefoot SDE (tna.p4 + intrinsic structs).",
            " * Wire `ParanetIngressParser` / `ParanetIngress` into your Pipeline package.",
            " *",
            " * Logical behaviour matches BMv2 emitter: IPv4 LPM on hdr.ipv4.dstAddr.",
            " */",
            "",
            "#include <core.p4>",
            "#include <tna.p4>",
            "",
            "const bit<16> ETHERTYPE_IPV4 = 0x0800;",
            "",
            "typedef bit<48> mac_addr_t;",
            "typedef bit<32> ipv4_addr_t;",
            "",
            "header ethernet_h {",
            "    mac_addr_t dstAddr;",
            "    mac_addr_t srcAddr;",
            "    bit<16> etherType;",
            "}",
            "",
            "header ipv4_h {",
            "    bit<4> version;",
            "    bit<4> ihl;",
            "    bit<8> diffserv;",
            "    bit<16> totalLen;",
            "    bit<16> identification;",
            "    bit<3> flags;",
            "    bit<13> fragOffset;",
            "    bit<8> ttl;",
            "    bit<8> protocol;",
            "    bit<16> hdrChecksum;",
            "    ipv4_addr_t srcAddr;",
            "    ipv4_addr_t dstAddr;",
            "}",
            "",
            "struct headers_t {",
            "    ethernet_h ethernet;",
            "    ipv4_h ipv4;",
            "}",
            "",
            "struct meta_t {",
            "    bit<1> ipv4_valid;",
            "}",
            "",
            f"parser ParanetIngressParser_{node_id}(",
            "    packet_in pkt,",
            "    out headers_t hdr,",
            "    out meta_t meta,",
            "    out ingress_intrinsic_metadata_t ig_intr_md) {",
            "    state start {",
            "        transition parse_ethernet;",
            "    }",
            "    state parse_ethernet {",
            "        pkt.extract(hdr.ethernet);",
            "        transition select(hdr.ethernet.etherType) {",
            "            ETHERTYPE_IPV4: parse_ipv4;",
            "            default: accept;",
            "        }",
            "    }",
            "    state parse_ipv4 {",
            "        pkt.extract(hdr.ipv4);",
            "        meta.ipv4_valid = 1;",
            "        transition accept;",
            "    }",
            "}",
            "",
            f"control ParanetIngress_{node_id}(",
            "    inout headers_t hdr,",
            "    inout meta_t meta,",
            "    in ingress_intrinsic_metadata_t ig_intr_md,",
            "    in ingress_intrinsic_metadata_from_parser_t ig_prsr_md,",
            "    inout ingress_intrinsic_metadata_for_deparser_t ig_dprsr_md,",
            "    inout ingress_intrinsic_metadata_for_tm_t ig_tm_md) {",
            "",
            "    action drop() {",
            "        ig_dprsr_md.drop_ctl = 1;",
            "    }",
            "",
            "    action forward(PortId_t port) {",
            "        ig_tm_md.ucast_egress_port = port;",
            "    }",
            "",
            "    table ipv4_lpm {",
            "        key = {",
            "            hdr.ipv4.dstAddr: lpm;",
            "        }",
            "        actions = {",
            "            forward;",
            "            drop;",
            "        }",
            "        const default_action = drop();",
            "        size = 1024;",
            "    }",
            "",
            "    apply {",
            fragment_block,
            "        if (hdr.ipv4.isValid()) {",
            "            ipv4_lpm.apply();",
            "        } else {",
            "            drop();",
            "        }",
            "    }",
            "}",
            "",
            f"control ParanetIngressDeparser_{node_id}(",
            "    packet_out pkt,",
            "    inout headers_t hdr,",
            "    in meta_t meta,",
            "    in ingress_intrinsic_metadata_for_deparser_t ig_dprsr_md) {",
            "    apply {",
            "        pkt.emit(hdr.ethernet);",
            "        pkt.emit(hdr.ipv4);",
            "    }",
            "}",
            "",
            "// Instantiate in your SDE, e.g.:",
            "//   Pipeline(",
            f"//       ParanetIngressParser_{node_id}(),",
            f"//       ParanetIngress_{node_id}(),",
            f"//       ParanetIngressDeparser_{node_id}(),",
            "//       ... egress stages ...",
            "//   ) pipe;",
            "",
        ]
        return "\n".join(lines)

    def emit_entries(self, ctx: EmitContext) -> dict[str, Any]:
        routes = collect_ipv4_route_entries(ctx)
        port_map = assign_egress_ports(routes)
        entries: list[dict[str, Any]] = []
        ctrl = f"ParanetIngress_{p4_safe_identifier(ctx.plan.node_id)}"

        for r in routes:
            parsed = parse_ipv4_cidr(r.cidr)
            port = port_map.get(r.destination, 1)
            entries.append(
                {
                    "table": f"{ctrl}.ipv4_lpm",
                    "action": "forward",
                    "match": {"hdr.ipv4.dstAddr": ["lpm", r.cidr]},
                    "action_params": {"port": port},
                    "route_name": r.route_name,
                    "destination_node": r.destination,
                    "fragment_id": r.fragment_id,
                }
            )

        return {
            "target": "tofino",
            "architecture": "tna",
            "node_id": ctx.plan.node_id,
            "routes": entries,
            "destination_to_port": port_map,
            "notes": [
                "Port mapping uses deterministic PortId_t values from intent `to:` node ids; "
                "map to device front-panel ports via BF Runtime / your control plane.",
                "Table programming uses the SDE (bf_rt / bfshell), not simple_switch_CLI.",
                "Adjust intrinsic metadata field names if your SDE version differs.",
            ],
        }


__all__ = ["TofinoEmitter"]
