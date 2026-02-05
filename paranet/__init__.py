"""
ParaNet - Multi-modal Programmable Network Infrastructure Agent

A LLM-driven platform for programming, compiling, deploying, and controlling
multi-modal network infrastructure (IP/NDN/GEO).
"""

__version__ = "0.1.0"
__author__ = "ParaNet Team"

from paranet.models import Topology, Intent

__all__ = [
    "__version__",
    "Topology",
    "Intent",
]
