from __future__ import annotations
import json
from typing import Any
from paranet.agent.core.events.action import DBQueryAction
from paranet.agent.core.events.observation import DBQueryObservation, Observation


def execute_db_query(query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    return []


class DBToolHandler:
    def handle_query(self, action: DBQueryAction) -> DBQueryObservation:
        rows = execute_db_query(action.query, action.params)
        return DBQueryObservation(content=json.dumps(rows), rows=rows)
