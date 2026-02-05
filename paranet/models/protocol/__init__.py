"""
Protocol Models Module

Data models for different network protocols:
- IP (routing, ACL, QoS)
- NDN (names, FIB, strategies)
- GEO (coordinates, regions)
"""

from paranet.models.protocol.ip import IPRoute, IPAddress, IPACL
from paranet.models.protocol.ndn import NDNName, FIBEntry, NDNStrategy
from paranet.models.protocol.geo import GeoCoordinate, GeoRegion

__all__ = [
    # IP
    "IPRoute",
    "IPAddress",
    "IPACL",
    # NDN
    "NDNName",
    "FIBEntry",
    "NDNStrategy",
    # GEO
    "GeoCoordinate",
    "GeoRegion",
]
