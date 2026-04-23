"""Tests for database tool handlers."""
import pytest
from unittest.mock import patch, MagicMock
from paranet.agent.tools.db import DBToolHandler
from paranet.agent.core.events.action import DBQueryAction
from paranet.agent.core.events.observation import DBQueryObservation


@patch("paranet.agent.tools.db.execute_db_query")
def test_db_query(mock_exec):
    mock_exec.return_value = [{"id": 1, "name": "test"}]
    handler = DBToolHandler()
    obs = handler.handle_query(DBQueryAction(query="SELECT * FROM topologies"))
    assert isinstance(obs, DBQueryObservation)
    assert len(obs.rows) == 1


@patch("paranet.agent.tools.db.execute_db_query")
def test_db_query_empty(mock_exec):
    mock_exec.return_value = []
    handler = DBToolHandler()
    obs = handler.handle_query(DBQueryAction(query="SELECT * FROM topologies WHERE 1=0"))
    assert isinstance(obs, DBQueryObservation)
    assert len(obs.rows) == 0
