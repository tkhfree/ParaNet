"""BMv2 / v1model P4_16 emitter: IPv4 LPM from intent_route_lookup + fragment order."""

from __future__ import annotations

from typing import Any

from compiler.backend.base import BackendEmitter
from compiler.backend.emit_context import EmitContext
from compiler.backend.p4_codegen import (
    collect_ipv4_route_entries,
    instruction_to_p4_comment,
    iter_fragments_in_plan_order,
    parse_ipv4_cidr,
    p4_safe_identifier,
    assign_egress_ports,
)


class Bmv2Emitter(BackendEmitter):
    """Emit a compilable v1model program for simple_switch / BMv2."""

    def emit(self, ctx: EmitContext) -> str:
        node_id = p4_safe_identifier(ctx.plan.node_id)

        # Fragment-order comments (all instruction kinds)
        frag_lines: list[str] = []
        for fr in iter_fragments_in_plan_order(ctx):
            frag_lines.append(f"        // --- fragment {fr.id} (order on this node) ---")
            for instr in fr.instructions:
                frag_lines.append(f"        {instruction_to_p4_comment(instr)}")

        fragment_block = "\n".join(frag_lines) if frag_lines else "        // (no fragments)"

        # P4 source
        lines: list[str] = [
            "/*",
            f" * ParaNet — BMv2 (v1model) data plane for node `{ctx.plan.node_id}`",
            " * Generated from NodePlanIR fragment order + intent_route_lookup (IPv4 LPM).",
            " *",
            " * Build: p4c --target bmv2 --arch v1model program.p4 -o program.json",
            " */",
            "",
            "#include <core.p4>",
            "#include <v1model.p4>",
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
            "parser IngressParser(packet_in pkt, out headers_t hdr, inout meta_t meta,",
            "                     inout standard_metadata_t sm) {",
            "    state start {",
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
            "control verifyChecksum(inout headers_t hdr, inout meta_t meta) {",
            "    apply { }",
            "}",
            "",
            "control computeChecksum(inout headers_t hdr, inout meta_t meta) {",
            "    apply { }",
            "}",
            "",
            f"control Ingress_{node_id}(inout headers_t hdr, inout meta_t meta,",
            "                  inout standard_metadata_t sm) {",
            "",
            "    action drop() {",
            "        mark_to_drop(sm);",
            "    }",
            "",
            "    action forward(bit<9> egress_port) {",
            "        sm.egress_spec = egress_port;",
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
            "control Egress(inout headers_t hdr, inout meta_t meta,",
            "               inout standard_metadata_t sm) {",
            "    apply { }",
            "}",
            "",
            "control Deparser(packet_out pkt, in headers_t hdr) {",
            "    apply {",
            "        pkt.emit(hdr.ethernet);",
            "        pkt.emit(hdr.ipv4);",
            "    }",
            "}",
            "",
            "V1Switch(",
            "    IngressParser(),",
            "    verifyChecksum(),",
            f"    Ingress_{node_id}(),",
            "    Egress(),",
            "    computeChecksum(),",
            "    Deparser()",
            ") main;",
            "",
        ]
        return "\n".join(lines)

    def emit_entries(self, ctx: EmitContext) -> dict[str, Any]:
        routes = collect_ipv4_route_entries(ctx)
        port_map = assign_egress_ports(routes)
        entries: list[dict[str, Any]] = []
        cli_lines: list[str] = []

        ctrl = f"Ingress_{p4_safe_identifier(ctx.plan.node_id)}"

        for r in routes:
            parsed = parse_ipv4_cidr(r.cidr)
            port = port_map.get(r.destination, 1)
            e = {
                "table": f"{ctrl}.ipv4_lpm",
                "action": "forward",
                "match": {
                    "hdr.ipv4.dstAddr": ["lpm", r.cidr],
                },
                "action_params": {"egress_port": port},
                "route_name": r.route_name,
                "destination_node": r.destination,
                "fragment_id": r.fragment_id,
            }
            entries.append(e)
            if parsed is not None:
                # simple_switch_CLI style (prefix notation)
                cli_lines.append(
                    f"table_add {ctrl}.ipv4_lpm forward {r.cidr} => {port}"
                )

        return {
            "target": "bmv2",
            "architecture": "v1model",
            "node_id": ctx.plan.node_id,
            "routes": entries,
            "simple_switch_cli": cli_lines,
            "destination_to_port": port_map,
            "notes": [
                "Ports are assigned deterministically from unique intent `to:` node ids; "
                "adjust to physical ports in your topology or control plane.",
                "Compile: p4c --target bmv2 --arch v1model program.p4 -o program.json",
            ],
        }


__all__ = ["Bmv2Emitter"]
