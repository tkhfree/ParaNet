from __future__ import annotations
from dataclasses import dataclass


@dataclass
class ParaNetAgentConfig:
    model: str = "gpt-4o-mini"
    api_key: str | None = None
    api_base: str | None = None
    max_iterations: int = 30
    temperature: float = 0.0
    enable_cmd: bool = True
    enable_ipython: bool = True
    enable_browse: bool = True
    enable_file_tools: bool = True
    enable_dsl_tools: bool = True
    enable_topology_tools: bool = True
    enable_db_tools: bool = True
    enable_finish: bool = True
