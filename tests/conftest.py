"""
Pytest Configuration and Fixtures

Shared fixtures for ParaNet tests.
"""

import pytest
from pathlib import Path


@pytest.fixture
def project_root() -> Path:
    """Return the project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture
def sample_dsl_dir(project_root: Path) -> Path:
    """Return the sample DSL examples directory."""
    return project_root / "dsl" / "examples"


@pytest.fixture
def sample_topology() -> dict:
    """Return a sample network topology for testing."""
    return {
        "name": "test-network",
        "nodes": [
            {"id": "node1", "type": "router", "address": "192.168.1.1"},
            {"id": "node2", "type": "router", "address": "192.168.2.1"},
            {"id": "node3", "type": "host", "address": "192.168.1.100"},
        ],
        "links": [
            {"source": "node1", "target": "node2", "bandwidth": 1000},
            {"source": "node1", "target": "node3", "bandwidth": 100},
        ],
    }


@pytest.fixture
def sample_intent() -> dict:
    """Return a sample network intent for testing."""
    return {
        "type": "route",
        "source": "node3",
        "destination": "192.168.2.0/24",
        "constraints": {
            "max_latency": 10,
            "min_bandwidth": 100,
        },
    }
