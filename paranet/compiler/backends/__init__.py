"""
Compiler Backends Module

Code generation backends for different target platforms:
- IP/OpenFlow
- NDN/NFD
- GEO routing
- P4
"""

from paranet.compiler.backends.base import BaseBackend, BackendResult
from paranet.compiler.backends.ip_backend import IPBackend
from paranet.compiler.backends.ndn_backend import NDNBackend
from paranet.compiler.backends.geo_backend import GEOBackend
from paranet.compiler.backends.p4_backend import P4Backend

__all__ = [
    "BaseBackend",
    "BackendResult",
    "IPBackend",
    "NDNBackend",
    "GEOBackend",
    "P4Backend",
]
