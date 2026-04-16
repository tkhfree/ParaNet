"""Tests for Polymorphic DSL Data IR, Collector, and P4 Emitter."""

from pathlib import Path

from compiler.frontend.poly_parser import PolyParser
from compiler.frontend.poly_ast import (
    DataBlockNode,
    HeaderFieldNode,
    ModuleDefNode,
    PacketDefNode,
    ParseDefNode,
    ParseMatchCaseNode,
    ServiceDefNode,
)
from compiler.semantic.poly_data_collector import (
    collect_data,
    _resolve_p4_type,
    _parse_when_clause,
)
from compiler.semantic.poly_topology_collector import collect_topology
from compiler.backend.p4_emitter import emit_p4_programs
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


# ---------------------------------------------------------------------------
# _resolve_p4_type
# ---------------------------------------------------------------------------

class TestResolveP4Type:
    def test_mac_addr(self):
        assert _resolve_p4_type("mac_addr") == "bit<48>"

    def test_ipv4_addr(self):
        assert _resolve_p4_type("ipv4_addr") == "bit<32>"

    def test_ipv6_addr(self):
        assert _resolve_p4_type("ipv6_addr") == "bit<128>"

    def test_bit16(self):
        assert _resolve_p4_type("bit16") == "bit<16>"

    def test_bit12(self):
        assert _resolve_p4_type("bit12") == "bit<12>"

    def test_uint32(self):
        assert _resolve_p4_type("uint32") == "bit<32>"

    def test_uint64(self):
        assert _resolve_p4_type("uint64") == "bit<64>"

    def test_uint8(self):
        assert _resolve_p4_type("uint8") == "bit<8>"

    def test_uint_with_parens(self):
        assert _resolve_p4_type("uint(16)") == "bit<16>"

    def test_port_t_v1model(self):
        assert _resolve_p4_type("port_t", "v1model") == "bit<9>"

    def test_port_t_tna(self):
        assert _resolve_p4_type("port_t", "tna") == "PortId_t"

    def test_bool(self):
        assert _resolve_p4_type("bool") == "bit<1>"

    def test_unknown_passthrough(self):
        assert _resolve_p4_type("custom_type") == "custom_type"

    def test_whitespace_stripped(self):
        assert _resolve_p4_type("  mac_addr  ") == "bit<48>"


# ---------------------------------------------------------------------------
# _parse_when_clause
# ---------------------------------------------------------------------------

class TestParseWhenClause:
    def test_empty(self):
        assert _parse_when_clause("") == []

    def test_simple_equality(self):
        keys = _parse_when_clause("eth_type == 0x0800")
        assert len(keys) == 1
        assert keys[0].field_name == "eth_type"
        assert keys[0].match_kind == "exact"

    def test_simple_inequality(self):
        keys = _parse_when_clause("dst_mac != 0xFFFFFFFFFFFF")
        assert len(keys) == 1
        assert keys[0].field_name == "dst_mac"
        assert keys[0].match_kind == "ternary"

    def test_compound(self):
        keys = _parse_when_clause("eth_type == 0x0800 && dst_mac != 0xFFFFFFFFFFFF")
        assert len(keys) == 2
        assert keys[0].field_name == "eth_type"
        assert keys[0].match_kind == "exact"
        assert keys[1].field_name == "dst_mac"
        assert keys[1].match_kind == "ternary"

    def test_matches_keyword(self):
        keys = _parse_when_clause("ipv4.dst_addr matches routing_table")
        assert len(keys) == 1
        assert keys[0].field_name == "ipv4.dst_addr"
        assert keys[0].match_kind == "ternary"

    def test_non_zero(self):
        keys = _parse_when_clause("flow_id != 0")
        assert len(keys) == 1
        assert keys[0].field_name == "flow_id"
        assert keys[0].match_kind == "ternary"


# ---------------------------------------------------------------------------
# collect_data
# ---------------------------------------------------------------------------

class TestCollectData:
    def _make_topo_ir(self):
        """Build a minimal TopologyIR with P4-capable devices."""
        from compiler.ir.poly_topology_ir import TopologyIR, DeployedNode
        return TopologyIR(
            id="test-topo",
            name="Test Topology",
            nodes=[
                DeployedNode(
                    id="spine1", name="spine1", type="switch",
                    properties={"dataPlaneTarget": "p4", "profile": "spine-profile"},
                ),
                DeployedNode(
                    id="leaf1", name="leaf1", type="switch",
                    properties={"dataPlaneTarget": "p4", "profile": "leaf-profile"},
                ),
                DeployedNode(
                    id="host1", name="host1", type="host",
                    properties={"dataPlaneTarget": "linux", "profile": "host-profile"},
                ),
            ],
            profiles={
                "spine-profile": {"target": "p4", "pipeline": "v1model", "compiler": "p4c"},
                "leaf-profile": {"target": "p4", "pipeline": "v1model", "compiler": "p4c"},
                "host-profile": {"target": "linux", "pipeline": "tc", "compiler": "tc-compiler"},
            },
        )

    def test_empty_data_block(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode()
        ir = collect_data(data_block, topo, "Test")
        assert ir.protocol_name == "Test"
        assert ir.packets == []
        assert ir.parsers == []
        assert ir.modules == []

    def test_packet_collection(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            packets=[
                PacketDefNode(
                    name="eth_packet",
                    header_fields=[
                        HeaderFieldNode(name="dst_mac", type_ref="mac_addr"),
                        HeaderFieldNode(name="src_mac", type_ref="mac_addr"),
                        HeaderFieldNode(name="eth_type", type_ref="bit16"),
                    ],
                    metadata_fields=[
                        HeaderFieldNode(name="ingress_port", type_ref="port_t"),
                    ],
                ),
            ],
        )
        ir = collect_data(data_block, topo, "Test")
        assert len(ir.packets) == 1
        assert ir.packets[0].name == "eth_packet"
        assert len(ir.packets[0].header_fields) == 3
        assert ir.packets[0].header_fields[0].p4_type == "bit<48>"
        assert ir.packets[0].metadata_fields[0].p4_type == "bit<9>"

    def test_parser_collection(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            parsers=[
                ParseDefNode(
                    name="eth_parser",
                    packet_ref="eth_packet",
                    extracts=["eth_packet"],
                    match_cases=[
                        ParseMatchCaseNode(match_value="0x0800", action="extract ipv4_parser"),
                        ParseMatchCaseNode(match_value="_", action="drop"),
                    ],
                ),
            ],
        )
        ir = collect_data(data_block, topo, "Test")
        assert len(ir.parsers) == 1
        assert ir.parsers[0].name == "eth_parser"
        assert len(ir.parsers[0].match_cases) == 2

    def test_module_collection(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            modules=[
                ModuleDefNode(
                    name="forward",
                    packet_ref="eth_packet",
                    when_clause="eth_type == 0x0800 && dst_mac != 0xFFFFFFFFFFFF",
                    action_clause="l2_forward(pkt)",
                ),
            ],
        )
        ir = collect_data(data_block, topo, "Test")
        assert len(ir.modules) == 1
        assert ir.modules[0].name == "forward"
        assert ir.modules[0].table_name == "tbl_forward"
        assert ir.modules[0].action_name == "act_forward"
        assert len(ir.modules[0].match_keys) == 2

    def test_service_collection(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            services=[
                ServiceDefNode(
                    name="l2_forwarding",
                    applies=["leaf", "spine"],
                    target_role="switch",
                    pipeline="ingress",
                ),
            ],
        )
        ir = collect_data(data_block, topo, "Test")
        assert len(ir.services) == 1  # Not stored directly but used for partitioning


# ---------------------------------------------------------------------------
# Device partitioning
# ---------------------------------------------------------------------------

class TestDevicePartitioning:
    def _make_topo_ir(self):
        from compiler.ir.poly_topology_ir import TopologyIR, DeployedNode
        return TopologyIR(
            id="test-topo",
            name="Test",
            nodes=[
                DeployedNode(id="spine1", name="spine1", type="switch",
                             properties={"dataPlaneTarget": "p4", "profile": "spine-profile"}),
                DeployedNode(id="leaf1", name="leaf1", type="switch",
                             properties={"dataPlaneTarget": "p4", "profile": "leaf-profile"}),
                DeployedNode(id="host1", name="host1", type="host",
                             properties={"dataPlaneTarget": "linux", "profile": "host-profile"}),
            ],
            profiles={
                "spine-profile": {"target": "p4", "pipeline": "v1model", "compiler": "p4c"},
                "leaf-profile": {"target": "p4", "pipeline": "v1model", "compiler": "p4c"},
                "host-profile": {"target": "linux", "pipeline": "tc", "compiler": "tc-compiler"},
            },
        )

    def test_linux_device_excluded(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            packets=[PacketDefNode(name="pkt")],
            modules=[ModuleDefNode(name="fwd", packet_ref="pkt")],
            services=[ServiceDefNode(name="svc", applies=["switch"], target_role="switch")],
        )
        ir = collect_data(data_block, topo, "Test")
        device_ids = {p.device_id for p in ir.device_programs}
        assert "host1" not in device_ids

    def test_p4_devices_included(self):
        topo = self._make_topo_ir()
        data_block = DataBlockNode(
            packets=[PacketDefNode(name="pkt")],
            modules=[ModuleDefNode(name="fwd", packet_ref="pkt")],
            services=[ServiceDefNode(name="svc", applies=["switch"], target_role="switch")],
        )
        ir = collect_data(data_block, topo, "Test")
        device_ids = {p.device_id for p in ir.device_programs}
        assert "spine1" in device_ids
        assert "leaf1" in device_ids

    def test_architecture_from_profile(self):
        from compiler.ir.poly_topology_ir import TopologyIR, DeployedNode
        topo = TopologyIR(
            id="t", name="T",
            nodes=[
                DeployedNode(id="sw1", name="sw1", type="switch",
                             properties={"dataPlaneTarget": "tofino", "profile": "tna-prof"}),
            ],
            profiles={
                "tna-prof": {"target": "tofino", "pipeline": "tna", "compiler": "bf-p4c"},
            },
        )
        data_block = DataBlockNode(
            packets=[PacketDefNode(name="pkt")],
            modules=[ModuleDefNode(name="fwd", packet_ref="pkt")],
            services=[ServiceDefNode(name="svc", applies=["switch"], target_role="switch")],
        )
        ir = collect_data(data_block, topo, "Test")
        assert len(ir.device_programs) == 1
        assert ir.device_programs[0].p4_arch == "tna"
        assert ir.device_programs[0].p4_target == "tofino"


# ---------------------------------------------------------------------------
# P4 Emitter
# ---------------------------------------------------------------------------

class TestP4Emitter:
    def _make_program(self, arch="v1model") -> DeviceP4Program:
        return DeviceP4Program(
            device_id="spine1",
            device_name="spine1",
            p4_arch=arch,
            p4_target="bmv2" if arch == "v1model" else "tofino",
            modules=[
                ModuleIR(
                    name="forward",
                    packet_ref="eth_packet",
                    when_clause="eth_type == 0x0800",
                    action_clause="l2_forward(pkt)",
                    match_keys=[MatchKeyIR(field_name="eth_type", match_kind="exact")],
                    table_name="tbl_forward",
                    action_name="act_forward",
                ),
            ],
            packets=[
                PacketIR(
                    name="eth_packet",
                    header_fields=[
                        FieldIR(name="dst_mac", type_ref="mac_addr", p4_type="bit<48>"),
                        FieldIR(name="src_mac", type_ref="mac_addr", p4_type="bit<48>"),
                        FieldIR(name="eth_type", type_ref="bit16", p4_type="bit<16>"),
                    ],
                    metadata_fields=[
                        FieldIR(name="ingress_port", type_ref="port_t", p4_type="bit<9>"),
                    ],
                ),
            ],
            parsers=[],
        )

    def test_v1model_has_includes(self):
        prog = self._make_program("v1model")
        ir = DataIR(device_programs=[prog], packets=prog.packets)
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "#include <v1model.p4>" in p4_code
        assert "#include <core.p4>" in p4_code

    def test_v1model_has_v1switch(self):
        prog = self._make_program("v1model")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "V1Switch(" in p4_code
        assert ") main;" in p4_code

    def test_v1model_has_table(self):
        prog = self._make_program("v1model")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "table tbl_forward" in p4_code
        assert "action act_forward" in p4_code

    def test_v1model_has_headers(self):
        prog = self._make_program("v1model")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "header eth_packet_t" in p4_code
        assert "bit<48> dst_mac" in p4_code

    def test_tna_has_includes(self):
        prog = self._make_program("tna")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "#include <tna.p4>" in p4_code

    def test_tna_has_package(self):
        prog = self._make_program("tna")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        p4_code = list(files.values())[0]
        assert "TNA(" in p4_code

    def test_output_file_paths(self):
        prog = self._make_program("v1model")
        ir = DataIR(device_programs=[prog])
        files = emit_p4_programs(ir)
        assert "devices/spine1/spine1.p4" in files


# ---------------------------------------------------------------------------
# End-to-end
# ---------------------------------------------------------------------------

class TestDataEndToEnd:
    def test_parse_and_generate(self):
        dsl = """
        polymorphic TestP4 {
            topology {
                profile sw-prof { target: "p4" pipeline: "v1model" compiler: "p4c" }
                node sw1 { role: "switch" profile: "sw-prof" }
                node sw2 { role: "switch" profile: "sw-prof" }
                link sw1 -> sw2 { bandwidth: "100G" latency: "0.1ms" }
            }
            data {
                packet eth {
                    header {
                        dst_mac: mac_addr;
                        src_mac: mac_addr;
                    }
                }
                module forward(eth) {
                    when: dst_mac == 0x0800;
                    action: l2_forward(pkt);
                }
                service switching {
                    applies: ["switch"]
                    target_role: "switch"
                    pipeline: "ingress"
                }
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(dsl)
        assert result.ast is not None, f"Parse failed: {[d.to_dict() for d in result.diagnostics]}"

        proto = result.ast.protocols[0]
        assert proto.topology is not None
        assert proto.data is not None

        topo_ir = collect_topology(proto.topology, proto.name)
        data_ir = collect_data(proto.data, topo_ir, proto.name)

        assert len(data_ir.packets) == 1
        assert data_ir.packets[0].name == "eth"
        assert len(data_ir.modules) == 1
        assert len(data_ir.device_programs) == 2  # sw1 and sw2

        files = emit_p4_programs(data_ir)
        assert len(files) == 2
        for path, code in files.items():
            assert "#include <v1model.p4>" in code
            assert "V1Switch(" in code

    def test_example_file(self):
        example_path = Path(__file__).parent.parent / "dsl" / "examples" / "poly_deterministic.poly"
        if not example_path.exists():
            return  # skip silently

        parser = PolyParser()
        result = parser.parse_file(example_path)
        assert result.ast is not None

        proto = result.ast.protocols[0]
        assert proto.topology is not None
        assert proto.data is not None

        topo_ir = collect_topology(proto.topology, proto.name)
        data_ir = collect_data(proto.data, topo_ir, proto.name)

        assert len(data_ir.packets) >= 1
        assert len(data_ir.modules) >= 1
        assert len(data_ir.services) >= 1
        assert len(data_ir.device_programs) >= 2  # spine and leaf nodes

        files = emit_p4_programs(data_ir)
        assert len(files) >= 2

        for path, code in files.items():
            assert path.endswith(".p4")
            assert "V1Switch(" in code
            assert "table " in code
