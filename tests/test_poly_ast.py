"""Tests for Polymorphic Network Protocol DSL AST nodes."""

from compiler.frontend.poly_ast import (
    PolyAstNode,
    PolyValueNode,
    PolyListValueNode,
    PolyObjectPairNode,
    PolyObjectValueNode,
    PolyAttrNode,
    MgmtChannelNode,
    ProfileNode,
    LayerNode,
    PatternNode,
    TopoNodeDefNode,
    LinkDefNode,
    ConstrainNode,
    TopologyBlockNode,
    AppMetaNode,
    StateDeclNode,
    ProviderEntryNode,
    DiscoveryNode,
    OnEventNode,
    PeriodicNode,
    FlowPushNode,
    ControlBlockNode,
    HeaderFieldNode,
    PacketDefNode,
    ParseMatchCaseNode,
    ParseDefNode,
    ModuleDefNode,
    ServiceDefNode,
    DataBlockNode,
    PolymorphicDefNode,
    PolyProgramNode,
)
from compiler.ir.common import SourceSpan


# ---------------------------------------------------------------------------
# Value nodes
# ---------------------------------------------------------------------------

class TestPolyValueNode:
    def test_default_creation(self):
        node = PolyValueNode()
        assert node.raw == ""
        assert node.kind == "string"
        assert node.span is None

    def test_string_value(self):
        node = PolyValueNode(raw="hello", kind="string")
        assert node.raw == "hello"
        assert node.kind == "string"

    def test_number_value(self):
        node = PolyValueNode(raw=42, kind="number")
        assert node.raw == 42
        assert node.kind == "number"

    def test_boolean_value(self):
        node = PolyValueNode(raw=True, kind="boolean")
        assert node.raw is True
        assert node.kind == "boolean"

    def test_with_span(self):
        span = SourceSpan(file="test.poly", line=1, column=1, end_line=1, end_column=5)
        node = PolyValueNode(span=span)
        assert node.span.file == "test.poly"


class TestPolyListValueNode:
    def test_default_empty(self):
        node = PolyListValueNode()
        assert node.items == []

    def test_with_items(self):
        items = [PolyValueNode(raw="a"), PolyValueNode(raw=1, kind="number")]
        node = PolyListValueNode(items=items)
        assert len(node.items) == 2
        assert node.items[0].raw == "a"


class TestPolyObjectPairNode:
    def test_creation(self):
        val = PolyValueNode(raw="10", kind="number")
        pair = PolyObjectPairNode(key="count", value=val)
        assert pair.key == "count"
        assert pair.value.raw == "10"


class TestPolyObjectValueNode:
    def test_default_empty(self):
        node = PolyObjectValueNode()
        assert node.pairs == []

    def test_with_pairs(self):
        pairs = [
            PolyObjectPairNode(key="name", value=PolyValueNode(raw="eth")),
            PolyObjectPairNode(key="speed", value=PolyValueNode(raw="100", kind="number")),
        ]
        node = PolyObjectValueNode(pairs=pairs)
        assert len(node.pairs) == 2


class TestPolyAttrNode:
    def test_creation(self):
        attr = PolyAttrNode(key="priority", value=PolyValueNode(raw="high"))
        assert attr.key == "priority"
        assert attr.value.raw == "high"

    def test_defaults(self):
        attr = PolyAttrNode()
        assert attr.key == ""
        assert attr.value is None


# ---------------------------------------------------------------------------
# Topology plane
# ---------------------------------------------------------------------------

class TestMgmtChannelNode:
    def test_creation(self):
        mgmt = MgmtChannelNode(address="10.0.0.1", protocol="ssh", port=22)
        assert mgmt.address == "10.0.0.1"
        assert mgmt.protocol == "ssh"
        assert mgmt.port == 22
        assert mgmt.auth is None

    def test_defaults(self):
        mgmt = MgmtChannelNode()
        assert mgmt.address == ""
        assert mgmt.protocol == ""
        assert mgmt.port == 0
        assert mgmt.auth is None

    def test_to_dict_serialization(self):
        mgmt = MgmtChannelNode(address="10.0.0.1", protocol="ssh", port=22)
        d = mgmt.to_dict()
        assert d["node_type"] == "MgmtChannelNode"
        assert d["address"] == "10.0.0.1"
        assert d["protocol"] == "ssh"
        assert d["port"] == 22
        assert d["auth"] is None
        assert d["span"] is None

    def test_to_dict_with_span(self):
        span = SourceSpan(file="a.poly", line=3, column=5, end_line=3, end_column=20)
        mgmt = MgmtChannelNode(span=span, address="10.0.0.1")
        d = mgmt.to_dict()
        assert d["span"]["file"] == "a.poly"
        assert d["span"]["line"] == 3


class TestProfileNode:
    def test_creation(self):
        mgmt = MgmtChannelNode(address="10.0.0.1", protocol="ssh", port=22)
        profile = ProfileNode(
            name="switch-profile",
            target="p4",
            pipeline="ingress",
            compiler="p4c",
            mgmt=mgmt,
        )
        assert profile.name == "switch-profile"
        assert profile.target == "p4"
        assert profile.pipeline == "ingress"
        assert profile.compiler == "p4c"
        assert profile.mgmt.address == "10.0.0.1"

    def test_defaults(self):
        profile = ProfileNode()
        assert profile.name == ""
        assert profile.target == ""
        assert profile.pipeline == ""
        assert profile.compiler == ""
        assert profile.mgmt is None


class TestLayerNode:
    def test_creation(self):
        layer = LayerNode(name="core", count=4, profile_ref="switch-profile")
        assert layer.name == "core"
        assert layer.count == 4
        assert layer.profile_ref == "switch-profile"

    def test_defaults(self):
        layer = LayerNode()
        assert layer.name == ""
        assert layer.count == 0
        assert layer.profile_ref == ""


class TestPatternNode:
    def test_creation(self):
        pattern = PatternNode(
            name="spine-leaf",
            params={"redundancy": "dual"},
            layers=["spine", "leaf"],
            connections=[("spine", "leaf"), ("leaf", "spine")],
        )
        assert pattern.name == "spine-leaf"
        assert pattern.params["redundancy"] == "dual"
        assert len(pattern.layers) == 2
        assert len(pattern.connections) == 2

    def test_defaults(self):
        pattern = PatternNode()
        assert pattern.name == ""
        assert pattern.params == {}
        assert pattern.layers == []
        assert pattern.connections == []


class TestTopoNodeDefNode:
    def test_creation(self):
        mgmt = MgmtChannelNode(address="10.0.0.5")
        node_def = TopoNodeDefNode(
            name="leaf1", role="leaf", profile_ref="switch-profile", mgmt=mgmt
        )
        assert node_def.name == "leaf1"
        assert node_def.role == "leaf"
        assert node_def.profile_ref == "switch-profile"
        assert node_def.mgmt.address == "10.0.0.5"

    def test_defaults(self):
        node_def = TopoNodeDefNode()
        assert node_def.name == ""
        assert node_def.role == ""
        assert node_def.profile_ref == ""
        assert node_def.mgmt is None


class TestLinkDefNode:
    def test_creation(self):
        link = LinkDefNode(
            src="spine1", dst="leaf1", directed=True, attrs={"bandwidth": "100G"}
        )
        assert link.src == "spine1"
        assert link.dst == "leaf1"
        assert link.directed is True
        assert link.attrs["bandwidth"] == "100G"

    def test_defaults(self):
        link = LinkDefNode()
        assert link.src == ""
        assert link.dst == ""
        assert link.directed is False
        assert link.attrs == {}


class TestConstrainNode:
    def test_creation(self):
        c = ConstrainNode(scope="links", expression="latency < 5ms")
        assert c.scope == "links"
        assert c.expression == "latency < 5ms"

    def test_defaults(self):
        c = ConstrainNode()
        assert c.scope == ""
        assert c.expression == ""


class TestTopologyBlockNode:
    def test_empty(self):
        topo = TopologyBlockNode()
        assert topo.profiles == []
        assert topo.patterns == []
        assert topo.nodes == []
        assert topo.links == []
        assert topo.constraints == []

    def test_with_content(self):
        profile = ProfileNode(name="p1")
        pattern = PatternNode(name="mesh")
        node_def = TopoNodeDefNode(name="n1")
        link = LinkDefNode(src="n1", dst="n2")
        constraint = ConstrainNode(scope="all", expression="redundancy >= 2")
        topo = TopologyBlockNode(
            profiles=[profile],
            patterns=[pattern],
            nodes=[node_def],
            links=[link],
            constraints=[constraint],
        )
        assert len(topo.profiles) == 1
        assert len(topo.patterns) == 1
        assert len(topo.nodes) == 1
        assert len(topo.links) == 1
        assert len(topo.constraints) == 1


# ---------------------------------------------------------------------------
# Control plane
# ---------------------------------------------------------------------------

class TestAppMetaNode:
    def test_creation(self):
        meta = AppMetaNode(
            name="my-app",
            version="1.0.0",
            description="Test app",
            onos_version="2.7",
            features=["feature1", "feature2"],
        )
        assert meta.name == "my-app"
        assert meta.version == "1.0.0"
        assert meta.description == "Test app"
        assert meta.onos_version == "2.7"
        assert len(meta.features) == 2

    def test_defaults(self):
        meta = AppMetaNode()
        assert meta.name == ""
        assert meta.version == ""
        assert meta.description == ""
        assert meta.onos_version == ""
        assert meta.features == []


class TestStateDeclNode:
    def test_creation(self):
        state = StateDeclNode(name="device_count", type_expr="int")
        assert state.name == "device_count"
        assert state.type_expr == "int"

    def test_defaults(self):
        state = StateDeclNode()
        assert state.name == ""
        assert state.type_expr == ""


class TestProviderEntryNode:
    def test_creation(self):
        provider = ProviderEntryNode(name="lldp", config={"interval": "30s"})
        assert provider.name == "lldp"
        assert provider.config["interval"] == "30s"

    def test_defaults(self):
        provider = ProviderEntryNode()
        assert provider.name == ""
        assert provider.config == {}


class TestDiscoveryNode:
    def test_creation(self):
        providers = [ProviderEntryNode(name="lldp")]
        discovery = DiscoveryNode(
            providers=providers,
            on_connected=["log_connected"],
            on_disconnected=["log_disconnected"],
        )
        assert len(discovery.providers) == 1
        assert discovery.on_connected == ["log_connected"]
        assert discovery.on_disconnected == ["log_disconnected"]

    def test_defaults(self):
        discovery = DiscoveryNode()
        assert discovery.providers == []
        assert discovery.on_connected == []
        assert discovery.on_disconnected == []


class TestOnEventNode:
    def test_creation(self):
        handler = OnEventNode(
            event_name="link_down",
            params=["src", "dst"],
            actions=["alert", "reroute"],
        )
        assert handler.event_name == "link_down"
        assert handler.params == ["src", "dst"]
        assert handler.actions == ["alert", "reroute"]

    def test_defaults(self):
        handler = OnEventNode()
        assert handler.event_name == ""
        assert handler.params == []
        assert handler.actions == []


class TestPeriodicNode:
    def test_creation(self):
        task = PeriodicNode(name="health_check", every="60s", actions=["check_status"])
        assert task.name == "health_check"
        assert task.every == "60s"
        assert task.actions == ["check_status"]

    def test_defaults(self):
        task = PeriodicNode()
        assert task.name == ""
        assert task.every == ""
        assert task.actions == []


class TestFlowPushNode:
    def test_creation(self):
        fp = FlowPushNode(target="switch1", rules_ref="acl_rules", via="netconf")
        assert fp.target == "switch1"
        assert fp.rules_ref == "acl_rules"
        assert fp.via == "netconf"

    def test_defaults(self):
        fp = FlowPushNode()
        assert fp.target == ""
        assert fp.rules_ref == ""
        assert fp.via is None


class TestControlBlockNode:
    def test_empty(self):
        ctrl = ControlBlockNode()
        assert ctrl.app is None
        assert ctrl.capabilities == []
        assert ctrl.states == []
        assert ctrl.discovery is None
        assert ctrl.event_handlers == []
        assert ctrl.periodic_tasks == []
        assert ctrl.flow_pushes == []

    def test_with_content(self):
        app = AppMetaNode(name="ctrl-app")
        states = [StateDeclNode(name="counter", type_expr="int")]
        discovery = DiscoveryNode(providers=[ProviderEntryNode(name="lldp")])
        events = [OnEventNode(event_name="link_up")]
        periodic = [PeriodicNode(name="poll")]
        flows = [FlowPushNode(target="sw1", rules_ref="rules")]
        ctrl = ControlBlockNode(
            app=app,
            capabilities=["forwarding"],
            states=states,
            discovery=discovery,
            event_handlers=events,
            periodic_tasks=periodic,
            flow_pushes=flows,
        )
        assert ctrl.app.name == "ctrl-app"
        assert len(ctrl.states) == 1
        assert len(ctrl.event_handlers) == 1


# ---------------------------------------------------------------------------
# Data plane
# ---------------------------------------------------------------------------

class TestHeaderFieldNode:
    def test_creation(self):
        field = HeaderFieldNode(name="eth_dst", type_ref="mac_addr")
        assert field.name == "eth_dst"
        assert field.type_ref == "mac_addr"

    def test_defaults(self):
        field = HeaderFieldNode()
        assert field.name == ""
        assert field.type_ref == ""


class TestPacketDefNode:
    def test_creation(self):
        header = [HeaderFieldNode(name="src_ip", type_ref="ipv4_addr")]
        meta = [HeaderFieldNode(name="ingress_port", type_ref="port_t")]
        pkt = PacketDefNode(name="eth_packet", header_fields=header, metadata_fields=meta)
        assert pkt.name == "eth_packet"
        assert len(pkt.header_fields) == 1
        assert len(pkt.metadata_fields) == 1

    def test_defaults(self):
        pkt = PacketDefNode()
        assert pkt.name == ""
        assert pkt.header_fields == []
        assert pkt.metadata_fields == []


class TestParseMatchCaseNode:
    def test_creation(self):
        case = ParseMatchCaseNode(match_value="0x0800", action="parse_ipv4")
        assert case.match_value == "0x0800"
        assert case.action == "parse_ipv4"

    def test_defaults(self):
        case = ParseMatchCaseNode()
        assert case.match_value == ""
        assert case.action == ""


class TestParseDefNode:
    def test_creation(self):
        cases = [ParseMatchCaseNode(match_value="0x0800", action="parse_ipv4")]
        parser = ParseDefNode(
            name="ethernet_parser",
            packet_ref="eth_packet",
            extracts=["eth_dst", "eth_src", "eth_type"],
            match_cases=cases,
            default_action="reject",
        )
        assert parser.name == "ethernet_parser"
        assert parser.packet_ref == "eth_packet"
        assert len(parser.extracts) == 3
        assert len(parser.match_cases) == 1
        assert parser.default_action == "reject"

    def test_defaults(self):
        parser = ParseDefNode()
        assert parser.name == ""
        assert parser.packet_ref == ""
        assert parser.extracts == []
        assert parser.match_cases == []
        assert parser.default_action == ""


class TestModuleDefNode:
    def test_creation(self):
        mod = ModuleDefNode(
            name="forward",
            packet_ref="eth_packet",
            when_clause="eth_type == 0x0800",
            action_clause="ipv4_forward",
            constraints={"priority": "high"},
        )
        assert mod.name == "forward"
        assert mod.packet_ref == "eth_packet"
        assert mod.when_clause == "eth_type == 0x0800"
        assert mod.action_clause == "ipv4_forward"
        assert mod.constraints["priority"] == "high"

    def test_defaults(self):
        mod = ModuleDefNode()
        assert mod.name == ""
        assert mod.packet_ref == ""
        assert mod.when_clause == ""
        assert mod.action_clause == ""
        assert mod.constraints == {}


class TestServiceDefNode:
    def test_creation(self):
        svc = ServiceDefNode(
            name="l2_forwarding",
            applies=["leaf"],
            target_role="switch",
            pipeline="ingress",
            constraints=["must_have_arp"],
        )
        assert svc.name == "l2_forwarding"
        assert svc.applies == ["leaf"]
        assert svc.target_role == "switch"
        assert svc.pipeline == "ingress"
        assert svc.constraints == ["must_have_arp"]

    def test_defaults(self):
        svc = ServiceDefNode()
        assert svc.name == ""
        assert svc.applies == []
        assert svc.target_role == ""
        assert svc.pipeline == ""
        assert svc.constraints == []


class TestDataBlockNode:
    def test_empty(self):
        data = DataBlockNode()
        assert data.packets == []
        assert data.parsers == []
        assert data.includes == []
        assert data.modules == []
        assert data.services == []

    def test_with_content(self):
        pkt = PacketDefNode(name="eth")
        parser = ParseDefNode(name="eth_parser")
        mod = ModuleDefNode(name="forward")
        svc = ServiceDefNode(name="l2_fwd")
        data = DataBlockNode(
            packets=[pkt],
            parsers=[parser],
            modules=[mod],
            services=[svc],
        )
        assert len(data.packets) == 1
        assert len(data.parsers) == 1
        assert len(data.modules) == 1
        assert len(data.services) == 1


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------

class TestPolymorphicDefNode:
    def test_minimal(self):
        proto = PolymorphicDefNode(name="my-protocol")
        assert proto.name == "my-protocol"
        assert proto.extends is None
        assert proto.mixins == []
        assert proto.topology is None
        assert proto.control is None
        assert proto.data is None

    def test_full(self):
        topo = TopologyBlockNode(profiles=[ProfileNode(name="p1")])
        ctrl = ControlBlockNode(app=AppMetaNode(name="app"))
        data = DataBlockNode(packets=[PacketDefNode(name="eth")])
        proto = PolymorphicDefNode(
            name="custom-proto",
            extends="base-proto",
            mixins=["mixin1", "mixin2"],
            topology=topo,
            control=ctrl,
            data=data,
        )
        assert proto.name == "custom-proto"
        assert proto.extends == "base-proto"
        assert len(proto.mixins) == 2
        assert proto.topology.profiles[0].name == "p1"
        assert proto.control.app.name == "app"
        assert proto.data.packets[0].name == "eth"


class TestPolyProgramNode:
    def test_empty(self):
        program = PolyProgramNode()
        assert program.protocols == []

    def test_with_protocols(self):
        proto1 = PolymorphicDefNode(name="proto-a")
        proto2 = PolymorphicDefNode(name="proto-b")
        program = PolyProgramNode(protocols=[proto1, proto2])
        assert len(program.protocols) == 2
        assert program.protocols[0].name == "proto-a"
        assert program.protocols[1].name == "proto-b"

    def test_to_dict(self):
        program = PolyProgramNode(protocols=[PolymorphicDefNode(name="test")])
        d = program.to_dict()
        assert d["node_type"] == "PolyProgramNode"
        assert len(d["protocols"]) == 1
        assert d["protocols"][0]["node_type"] == "PolymorphicDefNode"
        assert d["protocols"][0]["name"] == "test"


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class TestPolyAstNodeBase:
    def test_to_dict_includes_node_type(self):
        node = PolyAstNode()
        d = node.to_dict()
        assert d["node_type"] == "PolyAstNode"
        assert d["span"] is None

    def test_to_dict_with_span(self):
        span = SourceSpan(file="f.poly", line=1, column=1, end_line=1, end_column=1)
        node = PolyAstNode(span=span)
        d = node.to_dict()
        assert d["node_type"] == "PolyAstNode"
        assert d["span"]["file"] == "f.poly"
