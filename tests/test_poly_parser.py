"""Tests for the Polymorphic DSL parser."""

from __future__ import annotations

import pytest

from compiler.frontend.poly_parser import PolyParser, PolyParseResult
from compiler.frontend.poly_ast import (
    ConstrainNode,
    ControlBlockNode,
    DataBlockNode,
    FlowPushNode,
    HeaderFieldNode,
    LayerNode,
    LinkDefNode,
    MgmtChannelNode,
    ModuleDefNode,
    OnEventNode,
    PacketDefNode,
    ParseDefNode,
    ParseMatchCaseNode,
    PatternNode,
    PeriodicNode,
    PolyAttrNode,
    PolymorphicDefNode,
    PolyListValueNode,
    PolyObjectPairNode,
    PolyObjectValueNode,
    PolyProgramNode,
    PolyValueNode,
    ProfileNode,
    ServiceDefNode,
    StateDeclNode,
    TopoNodeDefNode,
    TopologyBlockNode,
    AppMetaNode,
    DiscoveryNode,
    ProviderEntryNode,
)


@pytest.fixture
def parser() -> PolyParser:
    return PolyParser()


# ---------------------------------------------------------------------------
# Minimal protocol parsing
# ---------------------------------------------------------------------------


class TestMinimalParsing:
    def test_empty_protocol(self, parser: PolyParser) -> None:
        result = parser.parse_text("polymorphic EmptyProto {}")
        assert result.ast is not None
        assert len(result.ast.protocols) == 1
        proto = result.ast.protocols[0]
        assert proto.name == "EmptyProto"
        assert proto.extends is None
        assert proto.mixins == []
        assert proto.topology is None
        assert proto.control is None
        assert proto.data is None
        assert result.diagnostics == []

    def test_protocol_with_extends(self, parser: PolyParser) -> None:
        result = parser.parse_text("polymorphic ChildProto extends BaseProto {}")
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.name == "ChildProto"
        assert proto.extends == "BaseProto"
        assert proto.mixins == []

    def test_protocol_with_mixins(self, parser: PolyParser) -> None:
        result = parser.parse_text("polymorphic MixProto with MixinA, MixinB {}")
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.name == "MixProto"
        assert proto.extends is None
        assert proto.mixins == ["MixinA", "MixinB"]

    def test_protocol_with_extends_and_mixins(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            "polymorphic FullProto extends Base with MixA, MixB {}"
        )
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.name == "FullProto"
        assert proto.extends == "Base"
        assert proto.mixins == ["MixA", "MixB"]

    def test_multiple_protocols(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            "polymorphic Proto1 {} polymorphic Proto2 {}"
        )
        assert result.ast is not None
        assert len(result.ast.protocols) == 2
        assert result.ast.protocols[0].name == "Proto1"
        assert result.ast.protocols[1].name == "Proto2"

    def test_empty_input(self, parser: PolyParser) -> None:
        result = parser.parse_text("")
        assert result.ast is not None
        assert len(result.ast.protocols) == 0

    def test_whitespace_only(self, parser: PolyParser) -> None:
        result = parser.parse_text("   \n\t  \n  ")
        assert result.ast is not None
        assert len(result.ast.protocols) == 0

    def test_hyphenated_name(self, parser: PolyParser) -> None:
        result = parser.parse_text("polymorphic my-proto {}")
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.name == "my-proto"

    def test_parse_error(self, parser: PolyParser) -> None:
        result = parser.parse_text("invalid syntax here")
        assert result.ast is None
        assert len(result.diagnostics) > 0
        assert result.diagnostics[0].code == "POLY001"


# ---------------------------------------------------------------------------
# Topology block
# ---------------------------------------------------------------------------


class TestTopologyBlock:
    def test_empty_topology(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            "polymorphic T1 { topology { } }"
        )
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.topology is not None
        assert proto.topology.profiles == []
        assert proto.topology.patterns == []
        assert proto.topology.nodes == []
        assert proto.topology.links == []
        assert proto.topology.constraints == []

    def test_profile_basic(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    profile switch-profile {
                        target: "p4"
                        pipeline: "ingress"
                        compiler: "p4c"
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.profiles) == 1
        profile = topo.profiles[0]
        assert profile.name == "switch-profile"
        assert profile.target == "p4"
        assert profile.pipeline == "ingress"
        assert profile.compiler == "p4c"
        assert profile.mgmt is None

    def test_profile_with_mgmt(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    profile p1 {
                        target: "p4"
                        pipeline: "ingress"
                        compiler: "p4c"
                        mgmt {
                            protocol: "grpc"
                            port: 50051
                            auth: "tls"
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        profile = topo.profiles[0]
        assert profile.mgmt is not None
        assert profile.mgmt.protocol == "grpc"
        assert profile.mgmt.port == 50051
        assert profile.mgmt.auth == "tls"

    def test_pattern_with_layers_and_mesh(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    pattern spine-leaf(redundancy: "dual") {
                        layer spine(4) { profile: "spine-profile" }
                        layer leaf(8) { profile: "leaf-profile" }
                        mesh(spine, leaf)
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.patterns) == 1
        pattern = topo.patterns[0]
        assert pattern.name == "spine-leaf"
        assert pattern.params == {"redundancy": "dual"}
        assert len(pattern.layers) == 2
        assert pattern.layers[0].name == "spine"
        assert pattern.layers[0].count == 4
        assert pattern.layers[0].profile_ref == "spine-profile"
        assert pattern.layers[1].name == "leaf"
        assert pattern.layers[1].count == 8
        assert len(pattern.connections) == 1
        assert pattern.connections[0] == ("spine", "leaf", "mesh")

    def test_node_with_mgmt(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    node leaf1 {
                        role: "leaf"
                        profile: "switch-profile"
                        mgmt {
                            address: "10.0.0.1"
                            protocol: "ssh"
                            port: 22
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.nodes) == 1
        node = topo.nodes[0]
        assert node.name == "leaf1"
        assert node.role == "leaf"
        assert node.profile_ref == "switch-profile"
        assert node.mgmt is not None
        assert node.mgmt.address == "10.0.0.1"
        assert node.mgmt.protocol == "ssh"
        assert node.mgmt.port == 22

    def test_directed_link(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    link spine1 -> leaf1 {
                        bandwidth: "100G"
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.links) == 1
        link = topo.links[0]
        assert link.src == "spine1"
        assert link.dst == "leaf1"
        assert link.directed is True

    def test_undirected_link(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    link n1 -- n2 {
                        bandwidth: "40G"
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.links) == 1
        link = topo.links[0]
        assert link.src == "n1"
        assert link.dst == "n2"
        assert link.directed is False

    def test_constrain(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic P1 {
                topology {
                    constrain links: "latency < 5ms"
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.constraints) == 1
        c = topo.constraints[0]
        assert c.scope == "links"
        assert c.expression == "latency < 5ms"


# ---------------------------------------------------------------------------
# Control block
# ---------------------------------------------------------------------------


class TestControlBlock:
    def test_empty_control(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            "polymorphic C1 { control { } }"
        )
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.control is not None
        assert proto.control.app is None
        assert proto.control.capabilities == []
        assert proto.control.states == []

    def test_app_metadata(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {
                control {
                    app {
                        name: "my-app"
                        version: "1.0.0"
                        description: "Test application"
                        onos_version: "2.7"
                        features: ["fwd", "acl"]
                    }
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert ctrl.app is not None
        assert ctrl.app.name == "my-app"
        assert ctrl.app.version == "1.0.0"
        assert ctrl.app.description == "Test application"
        assert ctrl.app.onos_version == "2.7"
        assert ctrl.app.features == ["fwd", "acl"]

    def test_capabilities(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {
                control {
                    capabilities: ["forwarding", "monitoring"]
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert ctrl.capabilities == ["forwarding", "monitoring"]

    def test_state_declaration(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {
                control {
                    state device_count: int;
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert len(ctrl.states) == 1
        assert ctrl.states[0].name == "device_count"
        assert ctrl.states[0].type_expr == "int"

    def test_on_event(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {
                control {
                    on link_down(src, dst) {
                        alert(src, dst);
                        reroute(src, dst);
                    }
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert len(ctrl.event_handlers) == 1
        handler = ctrl.event_handlers[0]
        assert handler.event_name == "link_down"
        assert handler.params == ["src", "dst"]
        assert len(handler.actions) == 2

    def test_periodic_task(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {
                control {
                    periodic health_check {
                        every: "60s"
                        check_status();
                    }
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert len(ctrl.periodic_tasks) == 1
        task = ctrl.periodic_tasks[0]
        assert task.name == "health_check"
        assert task.every == "60s"
        assert len(task.actions) == 1


# ---------------------------------------------------------------------------
# Data block
# ---------------------------------------------------------------------------


class TestDataBlock:
    def test_empty_data(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            "polymorphic D1 { data { } }"
        )
        assert result.ast is not None
        proto = result.ast.protocols[0]
        assert proto.data is not None
        assert proto.data.packets == []
        assert proto.data.parsers == []

    def test_packet_definition(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic D1 {
                data {
                    packet eth_packet {
                        header {
                            dst_mac: mac_addr;
                            src_mac: mac_addr;
                            eth_type: bit16;
                        }
                        metadata {
                            ingress_port: port_t;
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        data = result.ast.protocols[0].data
        assert data is not None
        assert len(data.packets) == 1
        pkt = data.packets[0]
        assert pkt.name == "eth_packet"
        assert len(pkt.header_fields) == 3
        assert pkt.header_fields[0].name == "dst_mac"
        assert pkt.header_fields[0].type_ref == "mac_addr"
        assert len(pkt.metadata_fields) == 1
        assert pkt.metadata_fields[0].name == "ingress_port"
        assert pkt.metadata_fields[0].type_ref == "port_t"

    def test_parse_definition(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic D1 {
                data {
                    parse eth_parser {
                        extract eth_header
                        match eth_type {
                            "0x0800" => extract ipv4_parser,
                            "0x86DD" => extract ipv6_parser,
                            _ => drop,
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        data = result.ast.protocols[0].data
        assert data is not None
        assert len(data.parsers) == 1
        p = data.parsers[0]
        assert p.name == "eth_parser"
        assert len(p.extracts) == 1
        assert p.extracts[0] == "eth_header"
        assert len(p.match_cases) == 2
        assert p.default_action == "drop"

    def test_include(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic D1 {
                data {
                    include "common_headers.poly"
                }
            }
            """
        )
        assert result.ast is not None
        data = result.ast.protocols[0].data
        assert data is not None
        assert "common_headers.poly" in data.includes

    def test_module_definition(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic D1 {
                data {
                    module forward(eth_packet) {
                        when: eth_type == 0x0800;
                        action: ipv4_forward(pkt);
                        constraints {
                            priority: "high";
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        data = result.ast.protocols[0].data
        assert data is not None
        assert len(data.modules) == 1
        mod = data.modules[0]
        assert mod.name == "forward"
        assert mod.packet_ref == "eth_packet"
        assert "eth_type == 0x0800" in mod.when_clause
        assert "ipv4_forward" in mod.action_clause

    def test_service_definition(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic D1 {
                data {
                    service l2_forwarding {
                        applies: ["leaf", "spine"]
                        target_role: "switch"
                        pipeline: "ingress"
                    }
                }
            }
            """
        )
        assert result.ast is not None
        data = result.ast.protocols[0].data
        assert data is not None
        assert len(data.services) == 1
        svc = data.services[0]
        assert svc.name == "l2_forwarding"
        assert svc.applies == ["leaf", "spine"]
        assert svc.target_role == "switch"
        assert svc.pipeline == "ingress"


# ---------------------------------------------------------------------------
# Value types
# ---------------------------------------------------------------------------


class TestValueTypes:
    def test_string_value(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic V1 {
                topology {
                    constrain scope: "test value"
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert len(topo.constraints) == 1
        assert topo.constraints[0].expression == "test value"

    def test_number_value(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic V1 {
                topology {
                    profile p1 {
                        target: "p4"
                        pipeline: "ingress"
                        compiler: "p4c"
                        mgmt {
                            port: 8080
                        }
                    }
                }
            }
            """
        )
        assert result.ast is not None
        topo = result.ast.protocols[0].topology
        assert topo is not None
        assert topo.profiles[0].mgmt is not None
        assert topo.profiles[0].mgmt.port == 8080

    def test_boolean_value(self, parser: PolyParser) -> None:
        # Test boolean in an object context
        result = parser.parse_text(
            """
            polymorphic V1 {
                topology {
                    constrain flag: "true"
                }
            }
            """
        )
        assert result.ast is not None

    def test_list_value(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic V1 {
                control {
                    capabilities: ["a", "b", "c"]
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert ctrl.capabilities == ["a", "b", "c"]

    def test_empty_list(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic V1 {
                control {
                    capabilities: []
                }
            }
            """
        )
        assert result.ast is not None
        ctrl = result.ast.protocols[0].control
        assert ctrl is not None
        assert ctrl.capabilities == []


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


class TestComments:
    def test_line_comment(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            // This is a comment
            polymorphic C1 {}
            """
        )
        assert result.ast is not None
        assert len(result.ast.protocols) == 1

    def test_block_comment(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            /* Block comment */
            polymorphic C1 {}
            """
        )
        assert result.ast is not None
        assert len(result.ast.protocols) == 1

    def test_inline_comment(self, parser: PolyParser) -> None:
        result = parser.parse_text(
            """
            polymorphic C1 {} // inline comment
            """
        )
        assert result.ast is not None
        assert len(result.ast.protocols) == 1


# ---------------------------------------------------------------------------
# Full integration
# ---------------------------------------------------------------------------


class TestFullIntegration:
    def test_full_protocol(self, parser: PolyParser) -> None:
        source = """
        polymorphic DeterministicFabric extends BaseFabric with RedundantMixin {
            topology {
                profile spine-profile {
                    target: "p4"
                    pipeline: "ingress"
                    compiler: "p4c"
                    mgmt {
                        protocol: "grpc"
                        port: 50051
                        auth: "tls"
                    }
                }
                node spine1 {
                    role: "spine"
                    profile: "spine-profile"
                    mgmt {
                        address: "10.0.0.1"
                        protocol: "ssh"
                        port: 22
                    }
                }
                link spine1 -> leaf1 {
                    bandwidth: "100G"
                }
                constrain links: "latency < 5ms"
            }
            control {
                app {
                    name: "fabric-controller"
                    version: "2.0.0"
                    description: "Deterministic fabric controller"
                    features: ["topology_discovery", "path_computation"]
                }
                capabilities: ["forwarding", "monitoring"]
                state device_count: int;
            }
            data {
                packet eth_packet {
                    header {
                        dst_mac: mac_addr;
                        src_mac: mac_addr;
                    }
                }
                service l2_fwd {
                    applies: ["leaf"]
                    target_role: "switch"
                    pipeline: "ingress"
                }
            }
        }
        """
        result = parser.parse_text(source)
        assert result.ast is not None
        assert len(result.diagnostics) == 0, f"Unexpected diagnostics: {result.diagnostics}"

        proto = result.ast.protocols[0]
        assert proto.name == "DeterministicFabric"
        assert proto.extends == "BaseFabric"
        assert proto.mixins == ["RedundantMixin"]

        # Topology
        assert proto.topology is not None
        assert len(proto.topology.profiles) == 1
        assert proto.topology.profiles[0].name == "spine-profile"
        assert proto.topology.profiles[0].mgmt is not None
        assert proto.topology.profiles[0].mgmt.auth == "tls"
        assert len(proto.topology.nodes) == 1
        assert proto.topology.nodes[0].mgmt is not None
        assert proto.topology.nodes[0].mgmt.address == "10.0.0.1"
        assert len(proto.topology.links) == 1
        assert proto.topology.links[0].directed is True
        assert len(proto.topology.constraints) == 1

        # Control
        assert proto.control is not None
        assert proto.control.app is not None
        assert proto.control.app.name == "fabric-controller"
        assert proto.control.capabilities == ["forwarding", "monitoring"]
        assert len(proto.control.states) == 1

        # Data
        assert proto.data is not None
        assert len(proto.data.packets) == 1
        assert proto.data.packets[0].name == "eth_packet"
        assert len(proto.data.packets[0].header_fields) == 2
        assert len(proto.data.services) == 1
        assert proto.data.services[0].applies == ["leaf"]
