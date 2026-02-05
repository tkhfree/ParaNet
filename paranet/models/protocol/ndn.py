"""
NDN Protocol Models

Data models for Named Data Networking.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NDNName(BaseModel):
    """NDN hierarchical name."""
    components: list[str] = Field(default_factory=list, description="Name components")
    
    @classmethod
    def from_uri(cls, uri: str) -> "NDNName":
        """
        Parse NDN name from URI format.
        
        Args:
            uri: NDN name URI (e.g., "/ndn/edu/example/data")
            
        Returns:
            NDNName instance.
        """
        if not uri:
            return cls(components=[])
        
        # Remove leading slash and split
        parts = uri.strip("/").split("/")
        return cls(components=[p for p in parts if p])
    
    def to_uri(self) -> str:
        """Convert to URI format."""
        if not self.components:
            return "/"
        return "/" + "/".join(self.components)
    
    def is_prefix_of(self, other: "NDNName") -> bool:
        """Check if this name is a prefix of another."""
        if len(self.components) > len(other.components):
            return False
        return self.components == other.components[:len(self.components)]
    
    def __str__(self) -> str:
        return self.to_uri()


class FIBEntry(BaseModel):
    """NDN Forwarding Information Base entry."""
    prefix: NDNName = Field(..., description="Name prefix")
    face_id: int = Field(..., ge=0, description="Face ID for forwarding")
    cost: int = Field(default=0, ge=0, description="Route cost")
    origin: int = Field(default=0, description="Route origin (static, nlsr, etc.)")
    
    class Config:
        """Pydantic config."""
        frozen = True


class StrategyType(Enum):
    """NDN forwarding strategy types."""
    BEST_ROUTE = "best-route"
    MULTICAST = "multicast"
    NCC = "ncc"
    ASF = "asf"
    RANDOM = "random"


class NDNStrategy(BaseModel):
    """NDN forwarding strategy configuration."""
    prefix: NDNName = Field(..., description="Name prefix for strategy")
    strategy: StrategyType = Field(default=StrategyType.BEST_ROUTE)
    parameters: dict[str, Any] = Field(default_factory=dict)
    
    def to_nfdc_command(self) -> str:
        """Generate nfdc strategy set command."""
        return f"nfdc strategy set {self.prefix.to_uri()} /localhost/nfd/strategy/{self.strategy.value}"


@dataclass
class PITEntry:
    """Pending Interest Table entry (for modeling)."""
    name: str
    incoming_faces: list[int] = field(default_factory=list)
    outgoing_faces: list[int] = field(default_factory=list)
    expiry_time: float | None = None


@dataclass
class CSPolicy:
    """Content Store policy configuration."""
    capacity: int = 65536  # Max entries
    replacement_policy: str = "lru"  # lru, lfu, fifo
    admit_policy: str = "all"  # all, on-hit
    serve_policy: str = "always"  # always, stale


@dataclass
class Face:
    """NDN Face (network interface) configuration."""
    face_id: int
    remote_uri: str
    local_uri: str | None = None
    scope: str = "non-local"  # local, non-local
    persistency: str = "persistent"  # persistent, permanent, on-demand
    link_type: str = "point-to-point"  # point-to-point, multi-access
    mtu: int | None = None
