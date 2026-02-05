"""
IP Protocol Models

Data models for IP networking (IPv4/IPv6).
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class IPVersion(Enum):
    """IP version."""
    V4 = 4
    V6 = 6


class IPAddress(BaseModel):
    """IP address with optional prefix length."""
    address: str = Field(..., description="IP address string")
    prefix_length: int = Field(default=32, ge=0, le=128)
    version: IPVersion = Field(default=IPVersion.V4)
    
    @property
    def cidr(self) -> str:
        """Return CIDR notation."""
        return f"{self.address}/{self.prefix_length}"
    
    def model_post_init(self, __context: Any) -> None:
        """Auto-detect version from address format."""
        if ":" in self.address:
            self.version = IPVersion.V6
            if self.prefix_length == 32:  # Default was for IPv4
                self.prefix_length = 128


class IPRoute(BaseModel):
    """IP routing table entry."""
    prefix: IPAddress = Field(..., description="Destination prefix")
    next_hop: str = Field(..., description="Next hop IP address")
    interface: str | None = Field(default=None, description="Outgoing interface")
    metric: int = Field(default=1, ge=0, description="Route metric/cost")
    admin_distance: int = Field(default=1, ge=0, le=255)
    
    class Config:
        """Pydantic config."""
        frozen = True


class ACLAction(Enum):
    """ACL action types."""
    PERMIT = "permit"
    DENY = "deny"


class ACLProtocol(Enum):
    """Protocols for ACL matching."""
    IP = "ip"
    TCP = "tcp"
    UDP = "udp"
    ICMP = "icmp"
    ANY = "any"


class IPACL(BaseModel):
    """IP Access Control List rule."""
    name: str = Field(..., description="ACL name/identifier")
    sequence: int = Field(default=10, ge=1, description="Rule sequence number")
    action: ACLAction = Field(default=ACLAction.PERMIT)
    protocol: ACLProtocol = Field(default=ACLProtocol.IP)
    
    source: IPAddress | None = Field(default=None, description="Source address/prefix")
    source_port: int | None = Field(default=None, ge=0, le=65535)
    destination: IPAddress | None = Field(default=None, description="Destination address/prefix")
    destination_port: int | None = Field(default=None, ge=0, le=65535)
    
    class Config:
        """Pydantic config."""
        frozen = True


@dataclass
class QoSPolicy:
    """Quality of Service policy."""
    name: str
    priority: int = 0
    bandwidth_limit: int | None = None  # bps
    latency_target: float | None = None  # ms
    jitter_target: float | None = None  # ms
    packet_loss_target: float | None = None  # percentage
    dscp_marking: int | None = None  # 0-63
    metadata: dict[str, Any] = field(default_factory=dict)
