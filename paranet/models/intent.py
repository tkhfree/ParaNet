"""
Intent Models

Defines the data structures for expressing network intents.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """Types of network intents."""
    DATA_PATH = "data_path"  # Establish data forwarding path
    QOS_POLICY = "qos_policy"  # Quality of Service configuration
    SECURITY_POLICY = "security_policy"  # Access control, filtering
    CACHE_POLICY = "cache_policy"  # NDN caching configuration
    GEO_REGION = "geo_region"  # Geographic routing region
    MULTICAST = "multicast"  # Multicast group configuration
    LOAD_BALANCE = "load_balance"  # Load balancing policy


class ProtocolType(str, Enum):
    """Supported network protocols."""
    IP = "ip"
    NDN = "ndn"
    GEO = "geo"
    HYBRID = "hybrid"  # Multiple protocols


class Endpoint(BaseModel):
    """Network endpoint specification."""
    node: str = Field(..., description="Node ID")
    interface: Optional[str] = None
    
    # Protocol-specific identifiers
    ip_address: Optional[str] = None
    ndn_prefix: Optional[str] = None
    geo_location: Optional[dict] = None


class QoSSpec(BaseModel):
    """Quality of Service specification."""
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high|critical)$")
    bandwidth_mbps: Optional[float] = None
    latency_bound_ms: Optional[float] = None
    jitter_bound_ms: Optional[float] = None
    loss_tolerance: Optional[float] = Field(default=None, ge=0, le=1)


class NDNSpec(BaseModel):
    """NDN-specific intent parameters."""
    name_prefix: str = Field(..., description="NDN name prefix")
    strategy: str = Field(default="best-route", description="Forwarding strategy")
    cache_policy: str = Field(default="lru", pattern="^(lru|lfu|fifo|none)$")
    cache_size_mb: Optional[int] = None
    freshness_seconds: Optional[int] = None


class GeoSpec(BaseModel):
    """GEO routing specific parameters."""
    target_latitude: float = Field(..., ge=-90, le=90)
    target_longitude: float = Field(..., ge=-180, le=180)
    radius_meters: Optional[float] = None  # Target region radius
    direction: Optional[str] = None  # Directional routing


class PathConstraint(BaseModel):
    """Constraints on path selection."""
    avoid_nodes: list[str] = Field(default_factory=list)
    avoid_links: list[str] = Field(default_factory=list)
    prefer_nodes: list[str] = Field(default_factory=list)
    prefer_links: list[str] = Field(default_factory=list)
    max_hops: Optional[int] = None


class Intent(BaseModel):
    """
    Network Intent - High-level description of desired network behavior.
    
    This is the core abstraction that users interact with, which gets
    compiled down to device-specific configurations.
    """
    id: str = Field(..., description="Unique intent identifier")
    name: str = Field(..., description="Human-readable intent name")
    description: Optional[str] = None
    
    type: IntentType = Field(..., description="Intent type")
    protocol: ProtocolType = Field(default=ProtocolType.IP)
    
    # Endpoints
    source: Optional[Endpoint] = None
    destination: Optional[Endpoint] = None
    
    # QoS requirements
    qos: Optional[QoSSpec] = None
    
    # Protocol-specific specs
    ndn_spec: Optional[NDNSpec] = None
    geo_spec: Optional[GeoSpec] = None
    
    # Path constraints
    constraints: Optional[PathConstraint] = None
    
    # Intent state
    enabled: bool = True
    priority: int = Field(default=100, ge=0, le=1000)
    
    # Metadata
    metadata: dict[str, Any] = Field(default_factory=dict)
    
    def is_ndn_intent(self) -> bool:
        """Check if this is an NDN-related intent."""
        return self.protocol == ProtocolType.NDN or self.ndn_spec is not None
    
    def is_geo_intent(self) -> bool:
        """Check if this is a GEO routing intent."""
        return self.protocol == ProtocolType.GEO or self.geo_spec is not None
    
    def validate_for_topology(self, topology: Any) -> list[str]:
        """
        Validate intent against a topology.
        Returns list of validation errors (empty if valid).
        """
        errors = []
        
        if self.source and self.source.node:
            if topology.get_node(self.source.node) is None:
                errors.append(f"Source node '{self.source.node}' not found in topology")
        
        if self.destination and self.destination.node:
            if topology.get_node(self.destination.node) is None:
                errors.append(f"Destination node '{self.destination.node}' not found in topology")
        
        return errors


class IntentSet(BaseModel):
    """Collection of intents with conflict detection."""
    intents: dict[str, Intent] = Field(default_factory=dict)
    
    def add(self, intent: Intent) -> None:
        """Add an intent to the set."""
        self.intents[intent.id] = intent
    
    def remove(self, intent_id: str) -> Optional[Intent]:
        """Remove and return an intent."""
        return self.intents.pop(intent_id, None)
    
    def get_by_type(self, intent_type: IntentType) -> list[Intent]:
        """Get all intents of a specific type."""
        return [i for i in self.intents.values() if i.type == intent_type]
    
    def get_by_protocol(self, protocol: ProtocolType) -> list[Intent]:
        """Get all intents for a specific protocol."""
        return [i for i in self.intents.values() if i.protocol == protocol]
    
    def get_enabled(self) -> list[Intent]:
        """Get all enabled intents, sorted by priority."""
        enabled = [i for i in self.intents.values() if i.enabled]
        return sorted(enabled, key=lambda x: x.priority, reverse=True)
