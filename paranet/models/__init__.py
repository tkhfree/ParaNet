"""
ParaNet Data Models

Core data models for topology, intent, and protocol definitions.
"""

from paranet.models.topology import Topology, Node, Link, NodeType, LinkType
from paranet.models.intent import Intent, IntentType, ProtocolType

# Protocol-specific models
from paranet.models.protocol import (
    # IP
    IPRoute,
    IPAddress,
    IPACL,
    # NDN
    NDNName,
    FIBEntry,
    NDNStrategy,
    # GEO
    GeoCoordinate,
    GeoRegion,
)

__all__ = [
    # Topology
    "Topology",
    "Node",
    "Link",
    "NodeType",
    "LinkType",
    # Intent
    "Intent",
    "IntentType",
    "ProtocolType",
    # IP Protocol
    "IPRoute",
    "IPAddress",
    "IPACL",
    # NDN Protocol
    "NDNName",
    "FIBEntry",
    "NDNStrategy",
    # GEO Protocol
    "GeoCoordinate",
    "GeoRegion",
]
