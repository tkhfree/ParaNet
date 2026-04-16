"""P4_16 code emitter for the Polymorphic DSL — per-device P4 program generation."""

from __future__ import annotations

from compiler.ir.poly_data_ir import (
    DataIR,
    DeviceP4Program,
    FieldIR,
    MatchCaseIR,
    MatchKeyIR,
    ModuleIR,
    PacketIR,
    ParserIR,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _header_type_name(packet_name: str) -> str:
    return f"{packet_name}_t"


def _emit_field(f: FieldIR) -> str:
    return f"    {f.p4_type} {f.name};"


def _emit_header_decls(packets: list[PacketIR]) -> str:
    """Generate P4 header type declarations."""
    lines: list[str] = []
    for pkt in packets:
        if pkt.header_fields:
            lines.append(f"header {_header_type_name(pkt.name)} {{")
            for f in pkt.header_fields:
                lines.append(_emit_field(f))
            lines.append("}")
            lines.append("")
    return "\n".join(lines)


def _emit_metadata_decls(packets: list[PacketIR]) -> str:
    """Generate P4 metadata struct declarations."""
    all_meta: list[FieldIR] = []
    for pkt in packets:
        all_meta.extend(pkt.metadata_fields)
    if not all_meta:
        return "struct meta_t {\n}"
    lines = ["struct meta_t {"]
    for f in all_meta:
        lines.append(_emit_field(f))
    lines.append("}")
    return "\n".join(lines)


def _emit_headers_struct(packets: list[PacketIR]) -> str:
    """Generate the headers struct that bundles all header instances."""
    lines = ["struct headers_t {"]
    for pkt in packets:
        if pkt.header_fields:
            lines.append(f"    {_header_type_name(pkt.name)} {pkt.name};")
    lines.append("}")
    return "\n".join(lines)


def _emit_parser_v1model(parsers: list[ParserIR], packets: list[PacketIR]) -> str:
    """Generate a v1model parser block."""
    lines = ["parser MyParser(packet_in packet,", "                out headers_t hdr,",
             "                inout meta_t meta,", "                inout standard_metadata_t std_meta) {"]

    # State for each parser
    for p in parsers:
        pkt = next((pk for pk in packets if pk.name == p.packet_ref), None)
        lines.append(f"    state {p.name} {{")
        if pkt and pkt.header_fields:
            lines.append(f"        packet.extract(hdr.{pkt.name});")
        if p.match_cases:
            match_field = p.match_cases[0].match_value if p.match_cases else ""
            # Use the first field of the referenced packet as match key
            if pkt and pkt.header_fields:
                match_field_name = pkt.header_fields[0].name if match_field else ""
            else:
                match_field_name = match_field
            lines.append(f"        transition select(hdr.{p.packet_ref}.{match_field_name}) {{")
            for case in p.match_cases:
                action = case.action.strip()
                if action.startswith("extract "):
                    target = action.replace("extract ", "").strip().rstrip(",")
                    lines.append(f"            {case.match_value}: {target};")
                elif action == "drop":
                    lines.append(f"            {case.match_value}: reject;")
                else:
                    lines.append(f"            {case.match_value}: {action};")
            if p.default_action:
                da = p.default_action.strip()
                if da == "drop":
                    lines.append(f"            default: reject;")
                elif da == "accept":
                    lines.append(f"            default: accept;")
                else:
                    lines.append(f"            default: {da};")
            else:
                lines.append(f"            default: accept;")
            lines.append("        }")
        else:
            lines.append("        transition accept;")
        lines.append("    }")
        lines.append("")

    lines.append("    state start {")
    if parsers:
        lines.append(f"        transition {parsers[0].name};")
    else:
        lines.append("        transition accept;")
    lines.append("    }")

    lines.append("}")
    return "\n".join(lines)


def _emit_table(mod: ModuleIR) -> str:
    """Generate a P4 table + action from a ModuleIR."""
    lines: list[str] = []

    # Action
    lines.append(f"action {mod.action_name}() {{")
    lines.append(f"    // {mod.action_clause}")
    lines.append("}")
    lines.append("")

    # Table
    lines.append(f"table {mod.table_name} {{")
    if mod.match_keys:
        lines.append("    key = {")
        for mk in mod.match_keys:
            lines.append(f"        hdr.{mod.packet_ref}.{mk.field_name}: {mk.match_kind};")
        lines.append("    }")
    else:
        lines.append("    key = {}")
    lines.append(f"    actions = {{")
    lines.append(f"        {mod.action_name};")
    lines.append(f"        drop;")
    lines.append(f"    }}")
    lines.append(f"    default_action = drop;")
    lines.append("}")
    return "\n".join(lines)


def _emit_ingress_control_v1model(modules: list[ModuleIR]) -> str:
    """Generate v1model ingress control block."""
    lines = [
        "control MyIngress(inout headers_t hdr,",
        "                  inout meta_t meta,",
        "                  inout standard_metadata_t std_meta) {",
        "",
        "    action drop() {",
        "        std_meta.egress_spec = 9w1;",  # drop port
        "    }",
        "",
    ]

    for mod in modules:
        lines.append(_emit_table(mod))
        lines.append("")

    # Apply block
    lines.append("    apply {")
    for mod in modules:
        lines.append(f"        {mod.table_name}.apply();")
    lines.append("    }")
    lines.append("}")

    return "\n".join(lines)


def _emit_v1model(program: DeviceP4Program) -> str:
    """Generate a complete v1model P4_16 program."""
    parts: list[str] = []

    # Header
    parts.append(f"// Auto-generated P4_16 v1model program for device: {program.device_name}")
    parts.append(f"// Protocol: {program.device_id}")
    parts.append(f"// Generated by ParaNet Polymorphic DSL Compiler")
    parts.append("")
    parts.append("#include <core.p4>")
    parts.append("#include <v1model.p4>")
    parts.append("")

    # Header declarations
    if program.packets:
        parts.append(_emit_header_decls(program.packets))
        parts.append(_emit_metadata_decls(program.packets))
        parts.append("")
        parts.append(_emit_headers_struct(program.packets))
        parts.append("")

    # Parser
    parts.append(_emit_parser_v1model(program.parsers, program.packets))
    parts.append("")

    # Checksum verification (stub)
    parts.append("control MyVerifyChecksum(inout headers_t hdr, inout meta_t meta) {")
    parts.append("    apply { }")
    parts.append("}")
    parts.append("")

    # Ingress
    parts.append(_emit_ingress_control_v1model(program.modules))
    parts.append("")

    # Egress (stub)
    parts.append("control MyEgress(inout headers_t hdr, inout meta_t meta,")
    parts.append("                  inout standard_metadata_t std_meta) {")
    parts.append("    apply { }")
    parts.append("}")
    parts.append("")

    # Checksum computation (stub)
    parts.append("control MyComputeChecksum(inout headers_t hdr, inout meta_t meta) {")
    parts.append("    apply { }")
    parts.append("}")
    parts.append("")

    # Deparser
    parts.append("control MyDeparser(packet_out packet, in headers_t hdr) {")
    parts.append("    apply {")
    for pkt in program.packets:
        if pkt.header_fields:
            parts.append(f"        packet.emit(hdr.{pkt.name});")
    parts.append("    }")
    parts.append("}")
    parts.append("")

    # Switch instantiation
    parts.append("V1Switch(")
    parts.append("    MyParser(),")
    parts.append("    MyVerifyChecksum(),")
    parts.append("    MyIngress(),")
    parts.append("    MyEgress(),")
    parts.append("    MyComputeChecksum(),")
    parts.append("    MyDeparser()")
    parts.append(") main;")

    return "\n".join(parts)


def _emit_tna(program: DeviceP4Program) -> str:
    """Generate a TNA P4_16 program (Tofino target)."""
    parts: list[str] = []

    parts.append(f"// Auto-generated P4_16 TNA program for device: {program.device_name}")
    parts.append(f"// Protocol: {program.device_id}")
    parts.append(f"// Generated by ParaNet Polymorphic DSL Compiler")
    parts.append("")
    parts.append("#include <core.p4>")
    parts.append("#include <tna.p4>")
    parts.append("")

    # Header declarations
    if program.packets:
        parts.append(_emit_header_decls(program.packets))
        parts.append(_emit_metadata_decls(program.packets))
        parts.append("")
        parts.append(_emit_headers_struct(program.packets))
        parts.append("")

    # Parser (simplified for TNA)
    parts.append("parser MyParser(packet_in packet,")
    parts.append("                out headers_t hdr,")
    parts.append("                inout meta_t meta,")
    parts.append("                in tna_metadata_t tna_meta) {")
    parts.append("    state start {")
    if program.packets and program.packets[0].header_fields:
        pkt = program.packets[0]
        parts.append(f"        packet.extract(hdr.{pkt.name});")
    parts.append("        transition accept;")
    parts.append("    }")
    parts.append("}")
    parts.append("")

    # Ingress (TNA pipeline)
    parts.append("control MyIngress(inout headers_t hdr,")
    parts.append("                  inout meta_t meta,")
    parts.append("                  in tna_metadata_t tna_meta) {")
    parts.append("")
    parts.append("    action drop() {")
    parts.append("        hdr._padding.setInvalid();")
    parts.append("    }")
    parts.append("")

    for mod in program.modules:
        parts.append(_emit_table(mod))
        parts.append("")

    parts.append("    apply {")
    for mod in program.modules:
        parts.append(f"        {mod.table_name}.apply();")
    parts.append("    }")
    parts.append("}")
    parts.append("")

    # Egress (stub)
    parts.append("control MyEgress(inout headers_t hdr,")
    parts.append("                  inout meta_t meta,")
    parts.append("                  in tna_metadata_t tna_meta) {")
    parts.append("    apply { }")
    parts.append("}")
    parts.append("")

    # Deparser
    parts.append("control MyDeparser(packet_out packet, in headers_t hdr) {")
    parts.append("    apply {")
    for pkt in program.packets:
        if pkt.header_fields:
            parts.append(f"        packet.emit(hdr.{pkt.name});")
    parts.append("    }")
    parts.append("}")
    parts.append("")

    # TNA package
    parts.append("TNA(")
    parts.append("    MyParser(),")
    parts.append("    MyIngress(),")
    parts.append("    MyEgress(),")
    parts.append("    MyDeparser()")
    parts.append(") main;")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

def emit_p4_programs(data_ir: DataIR) -> dict[str, str]:
    """Generate per-device P4_16 source files from a DataIR.

    Returns:
        dict mapping "devices/{device_id}/{device_id}.p4" to P4 source code.
    """
    files: dict[str, str] = {}
    for prog in data_ir.device_programs:
        filename = f"devices/{prog.device_id}/{prog.device_id}.p4"
        if prog.p4_arch == "tna":
            files[filename] = _emit_tna(prog)
        else:
            files[filename] = _emit_v1model(prog)
    return files


__all__ = ["emit_p4_programs"]
