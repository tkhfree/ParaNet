from __future__ import annotations
import json
from typing import Any
from paranet.agent.core.events.action import TopologyAction
from paranet.agent.core.events.observation import TopologyObservation, Observation


def execute_topology_operation(operation: str, params: dict[str, Any], topology_id: str = "") -> Any:
    return []


class TopologyToolHandler:
    def handle(self, action: TopologyAction) -> TopologyObservation:
        result = execute_topology_operation(action.operation, action.params, action.topology_id)
        if isinstance(result, list):
            content = json.dumps(result)
        elif isinstance(result, dict):
            content = json.dumps(result)
        else:
            content = str(result)
        return TopologyObservation(content=content, topology_id=action.topology_id)
