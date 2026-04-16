"""Tests for Polymorphic DSL Topology IR and Collector."""

from compiler.frontend.poly_parser import PolyParser
from compiler.frontend.poly_ast import (
    MgmtChannelNode,
    PatternNode,
    LayerNode,
    ProfileNode,
    TopoNodeDefNode,
    LinkDefNode,
    ConstrainNode,
    TopologyBlockNode,
)
from compiler.semantic.poly_topology_collector import (
    collect_topology,
    _expand_pattern,
    _parse_bandwidth,
    _parse_latency,
)
from compiler.ir.poly_topology_ir import TopologyIR


class TestTopologyIR:
    def test_empty_topology(self):
        topo = TopologyBlockNode()
        ir = collect_topology(topo, "Test")
        assert ir is not None
        assert len(ir.nodes) == 0
        assert len(ir.links) == 0

    def test_concrete_nodes(self):
        topo = TopologyBlockNode(
            profiles=[ProfileNode(name="SW", target="bmv2", pipeline="v1model", compiler="p4c-bmv2")],
            nodes=[
                TopoNodeDefNode(name="h1", role="endpoint", profile_ref="SW",
                               mgmt=MgmtChannelNode(address="10.0.0.1", protocol="grpc", port=50052)),
                TopoNodeDefNode(name="h2", role="endpoint", profile_ref="SW",
                               mgmt=MgmtChannelNode(address="10.0.0.2", protocol="grpc", port=50052)),
            ],
        )
        ir = collect_topology(topo, "Test")
        assert len(ir.nodes) == 2
        assert ir.nodes[0].id == "h1"
        assert ir.nodes[0].type == "host"  # endpoint -> host
        assert ir.nodes[0].config["ip"] == "10.0.0.1"
        assert ir.nodes[1].config["ip"] == "10.0.0.2"

    def test_concrete_links(self):
        topo = TopologyBlockNode(
            nodes=[
                TopoNodeDefNode(name="a", role="switch", profile_ref=""),
                TopoNodeDefNode(name="b", role="switch", profile_ref=""),
            ],
            links=[LinkDefNode(src="a", dst="b", directed=True)],
        )
        ir = collect_topology(topo, "Test")
        assert len(ir.links) == 1
        assert ir.links[0].source == "a"
        assert ir.links[0].target == "b"

    def test_pattern_expansion(self):
        profile_map = {"SW": {"target": "bmv2", "pipeline": "v1model", "compiler": "p4c-bmv2"}}
        pattern = PatternNode(
            name="spine_leaf",
            params={},
            layers=[
                LayerNode(name="spine", count=2, profile_ref="SW"),
                LayerNode(name="leaf", count=3, profile_ref="SW"),
            ],
            connections=[("spine", "leaf", "mesh")],
        )
        nodes, links = _expand_pattern(pattern, profile_map, set())
        # 2 spine + 3 leaf = 5 nodes
        assert len(nodes) == 5
        # mesh: 2 * 3 = 6 links
        assert len(links) == 6
        # Check node names contain layer names
        spine_nodes = [n for n in nodes if n.name.startswith("spine_leaf-spine-")]
        leaf_nodes = [n for n in nodes if n.name.startswith("spine_leaf-leaf-")]
        assert len(spine_nodes) == 2
        assert len(leaf_nodes) == 3
        # All spine-leaf links exist
        for s in spine_nodes:
            for l in leaf_nodes:
                link_ids = [lk.source + "-" + lk.target for lk in links]
                assert f"{s.id}-{l.id}" in link_ids or f"{l.id}-{s.id}" in link_ids

    def test_constraints(self):
        topo = TopologyBlockNode(
            constraints=[ConstrainNode(scope="all_links", expression="bandwidth >= 1Gbps")],
        )
        ir = collect_topology(topo, "Test")
        assert len(ir.constraints) == 1
        assert "all_links" in ir.constraints[0]

    def test_to_render_json(self):
        topo = TopologyBlockNode(
            nodes=[TopoNodeDefNode(name="s1", role="switch", profile_ref="")],
        )
        ir = collect_topology(topo, "TestProto")
        j = ir.to_render_json()
        assert "nodes" in j
        assert "links" in j
        assert j["name"] == "TestProto Topology"
        assert len(j["nodes"]) == 1
        assert "position" in j["nodes"][0]
        assert "properties" in j["nodes"][0]

    def test_full_example_file(self):
        """Parse the example file and generate topology IR."""
        from pathlib import Path
        example_path = Path(__file__).resolve().parents[1] / "dsl" / "examples" / "poly_deterministic.poly"
        if not example_path.exists():
            return

        parser = PolyParser()
        result = parser.parse_file(example_path)
        assert result.ast is not None

        proto = result.ast.protocols[0]
        assert proto.topology is not None

        ir = collect_topology(proto.topology, proto.name)
        assert len(ir.nodes) > 0
        assert len(ir.links) > 0

        # Verify render JSON is valid
        j = ir.to_render_json()
        assert len(j["nodes"]) > 0
        assert len(j["links"]) > 0

        # All link sources/targets reference existing node IDs
        node_ids = {n["id"] for n in j["nodes"]}
        for lk in j["links"]:
            assert lk["source"] in node_ids, f"Link source {lk['source']} not in nodes"
            assert lk["target"] in node_ids, f"Link target {lk['target']} not in nodes"

    def test_parse_and_collect(self):
        """Parse DSL text and collect topology in one flow."""
        text = """
        polymorphic Test {
            topology {
                profile SW {
                    target: "bmv2"
                    pipeline: "v1model"
                    compiler: "p4c-bmv2"
                }
                node s1 { role: "switch" profile: "SW" }
                node s2 { role: "switch" profile: "SW" }
                link s1 -> s2 { bandwidth: "10G" latency: "0.5ms" }
                constrain all: "redundancy >= 2"
            }
        }
        """
        parser = PolyParser()
        result = parser.parse_text(text)
        assert result.ast is not None
        proto = result.ast.protocols[0]
        ir = collect_topology(proto.topology, proto.name)

        assert len(ir.nodes) == 2
        assert len(ir.links) == 1
        assert ir.links[0].source == "s1"
        assert ir.links[0].target == "s2"
        assert ir.links[0].bandwidth == 10000  # 10G = 10000 Mbps
        assert ir.links[0].delay == 0.5  # 0.5ms


class TestParsing:
    def test_parse_bandwidth(self):
        assert _parse_bandwidth("100G") == 100000
        assert _parse_bandwidth("10Gbps") == 10000
        assert _parse_bandwidth("1T") == 1000000
        assert _parse_bandwidth("100M") == 100
        assert _parse_bandwidth("100") == 100

    def test_parse_latency(self):
        assert _parse_latency("0.1ms") == 0.1
        assert _parse_latency("< 1ms") == 1.0
        assert _parse_latency("50us") == 0.05
        assert _parse_latency("1.5") == 1.5
