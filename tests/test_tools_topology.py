"""Tests for topology tool handlers."""
import pytest
from unittest.mock import patch, MagicMock
from paranet.agent.tools.topology import TopologyToolHandler
from paranet.agent.core.events.action import TopologyAction
from paranet.agent.core.events.observation import TopologyObservation


@patch("paranet.agent.tools.topology.execute_topology_operation")
def test_topology_list(mock_exec):
    mock_exec.return_value = [{"id": "1", "name": "test-topo"}]
    handler = TopologyToolHandler()
    obs = handler.handle(TopologyAction(operation="list", params={}))
    assert isinstance(obs, TopologyObservation)
    assert "test-topo" in obs.content


@patch("paranet.agent.tools.topology.execute_topology_operation")
def test_topology_add_node(mock_exec):
    mock_exec.return_value = {"id": "n1", "name": "s1"}
    handler = TopologyToolHandler()
    obs = handler.handle(TopologyAction(operation="add_node", params={"name": "s1", "topology_id": "1"}))
    assert isinstance(obs, TopologyObservation)
