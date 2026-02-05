"""
Southbound Interface Module

Drivers for communicating with network devices:
- P4Runtime
- NFD management
- NETCONF
- REST API
"""

from paranet.controller.southbound.base import SouthboundDriver
from paranet.controller.southbound.p4runtime import P4RuntimeDriver
from paranet.controller.southbound.nfd import NFDDriver
from paranet.controller.southbound.netconf import NETCONFDriver

__all__ = [
    "SouthboundDriver",
    "P4RuntimeDriver",
    "NFDDriver",
    "NETCONFDriver",
]
