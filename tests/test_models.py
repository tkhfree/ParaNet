"""
Tests for ParaNet data models.
"""

import pytest

from paranet.models.topology import Topology, Node, Link, NodeType
from paranet.models.intent import Intent, IntentType
from paranet.models.protocol.ip import IPAddress, IPRoute, IPACL, ACLAction
from paranet.models.protocol.ndn import NDNName, FIBEntry
from paranet.models.protocol.geo import GeoCoordinate, GeoRegion


class TestTopology:
    """Tests for Topology model."""
    
    def test_create_empty_topology(self):
        """Test creating an empty topology."""
        topo = Topology(name="test")
        assert topo.name == "test"
        assert len(topo.nodes) == 0
        assert len(topo.links) == 0
    
    def test_add_node(self):
        """Test adding nodes to topology."""
        topo = Topology(name="test")
        node = Node(id="n1", name="node1", type=NodeType.ROUTER)
        topo.add_node(node)
        assert len(topo.nodes) == 1
        assert topo.get_node("n1") == node
    
    def test_add_link(self):
        """Test adding links to topology."""
        topo = Topology(name="test")
        topo.add_node(Node(id="n1", name="node1", type=NodeType.ROUTER))
        topo.add_node(Node(id="n2", name="node2", type=NodeType.ROUTER))
        
        link = Link(id="l1", source_node="n1", target_node="n2")
        topo.add_link(link)
        
        assert len(topo.links) == 1


class TestIPModels:
    """Tests for IP protocol models."""
    
    def test_ip_address_cidr(self):
        """Test IPAddress CIDR notation."""
        addr = IPAddress(address="192.168.1.0", prefix_length=24)
        assert addr.cidr == "192.168.1.0/24"
    
    def test_ip_route_creation(self):
        """Test IPRoute creation."""
        route = IPRoute(
            prefix=IPAddress(address="10.0.0.0", prefix_length=8),
            next_hop="192.168.1.1",
        )
        assert route.metric == 1
    
    def test_acl_creation(self):
        """Test IPACL creation."""
        acl = IPACL(name="test-acl", action=ACLAction.DENY)
        assert acl.action == ACLAction.DENY


class TestNDNModels:
    """Tests for NDN protocol models."""
    
    def test_ndn_name_from_uri(self):
        """Test NDNName parsing from URI."""
        name = NDNName.from_uri("/ndn/edu/ucla/cs")
        assert len(name.components) == 4
        assert name.components[0] == "ndn"
    
    def test_ndn_name_to_uri(self):
        """Test NDNName conversion to URI."""
        name = NDNName(components=["ndn", "test"])
        assert name.to_uri() == "/ndn/test"
    
    def test_ndn_name_prefix_check(self):
        """Test NDNName prefix checking."""
        prefix = NDNName.from_uri("/ndn/edu")
        name = NDNName.from_uri("/ndn/edu/ucla")
        assert prefix.is_prefix_of(name)
        assert not name.is_prefix_of(prefix)


class TestGeoModels:
    """Tests for GEO protocol models."""
    
    def test_geo_coordinate_distance(self):
        """Test distance calculation between coordinates."""
        nyc = GeoCoordinate(latitude=40.7128, longitude=-74.0060)
        la = GeoCoordinate(latitude=34.0522, longitude=-118.2437)
        
        distance = nyc.distance_to(la)
        # Approximate distance NYC to LA is ~3940 km
        assert 3900 < distance < 4000
    
    def test_geo_region_contains(self):
        """Test region containment check."""
        region = GeoRegion(
            name="test",
            vertices=[
                GeoCoordinate(latitude=0, longitude=0),
                GeoCoordinate(latitude=0, longitude=10),
                GeoCoordinate(latitude=10, longitude=10),
                GeoCoordinate(latitude=10, longitude=0),
            ]
        )
        
        inside = GeoCoordinate(latitude=5, longitude=5)
        outside = GeoCoordinate(latitude=15, longitude=15)
        
        assert region.contains(inside)
        assert not region.contains(outside)
