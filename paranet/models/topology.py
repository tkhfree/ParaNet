"""
Network Topology Models

Defines the core data structures for representing network topology.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Types of network nodes."""
    SWITCH = "switch"
    ROUTER = "router"
    HOST = "host"
    NFD = "nfd"  # NDN Forwarding Daemon
    P4_SWITCH = "p4_switch"
    GEO_ROUTER = "geo_router"


class LinkType(str, Enum):
    """Types of network links."""
    ETHERNET = "ethernet"
    WIRELESS = "wireless"
    OPTICAL = "optical"
    VIRTUAL = "virtual"


class GeoLocation(BaseModel):
    """Geographic location coordinates."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    altitude: Optional[float] = None  # meters


class NodeCapabilities(BaseModel):
    """Capabilities of a network node."""
    supports_ip: bool = True
    supports_ndn: bool = False
    supports_geo: bool = False
    supports_p4: bool = False
    cache_size_mb: Optional[int] = None  # For NDN nodes


class Node(BaseModel):
    """Network node representation."""
    id: str = Field(..., description="Unique node identifier")
    name: str = Field(..., description="Human-readable node name")
    type: NodeType = Field(default=NodeType.SWITCH)
    
    # Network addresses
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    
    # Geographic location (for GEO routing)
    location: Optional[GeoLocation] = None
    
    # Capabilities
    capabilities: NodeCapabilities = Field(default_factory=NodeCapabilities)
    
    # Metadata
    metadata: dict = Field(default_factory=dict)
    
    def supports_protocol(self, protocol: str) -> bool:
        """Check if node supports a specific protocol."""
        protocol = protocol.lower()
        if protocol == "ip":
            return self.capabilities.supports_ip
        elif protocol == "ndn":
            return self.capabilities.supports_ndn
        elif protocol == "geo":
            return self.capabilities.supports_geo
        elif protocol == "p4":
            return self.capabilities.supports_p4
        return False


class LinkProperties(BaseModel):
    """Physical and logical properties of a link."""
    bandwidth_mbps: Optional[float] = None
    latency_ms: Optional[float] = None
    loss_rate: Optional[float] = Field(default=None, ge=0, le=1)
    mtu: int = 1500


class Link(BaseModel):
    """Network link between two nodes."""
    id: str = Field(..., description="Unique link identifier")
    source_node: str = Field(..., description="Source node ID")
    source_port: Optional[str] = None
    target_node: str = Field(..., description="Target node ID")
    target_port: Optional[str] = None
    
    type: LinkType = Field(default=LinkType.ETHERNET)
    bidirectional: bool = True
    
    properties: LinkProperties = Field(default_factory=LinkProperties)
    metadata: dict = Field(default_factory=dict)


class Topology(BaseModel):
    """Complete network topology."""
    name: str = Field(default="default", description="Topology name")
    description: Optional[str] = None
    
    nodes: dict[str, Node] = Field(default_factory=dict)
    links: dict[str, Link] = Field(default_factory=dict)
    
    def add_node(self, node: Node) -> None:
        """Add a node to the topology."""
        self.nodes[node.id] = node
    
    def add_link(self, link: Link) -> None:
        """Add a link to the topology."""
        if link.source_node not in self.nodes:
            raise ValueError(f"Source node {link.source_node} not found")
        if link.target_node not in self.nodes:
            raise ValueError(f"Target node {link.target_node} not found")
        self.links[link.id] = link
    
    def get_node(self, node_id: str) -> Optional[Node]:
        """Get a node by ID."""
        return self.nodes.get(node_id)
    
    def get_neighbors(self, node_id: str) -> list[str]:
        """Get neighboring node IDs."""
        neighbors = []
        for link in self.links.values():
            if link.source_node == node_id:
                neighbors.append(link.target_node)
            elif link.bidirectional and link.target_node == node_id:
                neighbors.append(link.source_node)
        return neighbors
    
    def get_nodes_by_type(self, node_type: NodeType) -> list[Node]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes.values() if n.type == node_type]
    
    def get_nodes_supporting_protocol(self, protocol: str) -> list[Node]:
        """Get all nodes supporting a specific protocol."""
        return [n for n in self.nodes.values() if n.supports_protocol(protocol)]
