"""
Agent Tools Module

Tools available to the LLM agent for network operations:
- Topology queries
- Configuration compilation
- Deployment execution
- Status monitoring
"""

from paranet.agent.tools.base import BaseTool, ToolResult
from paranet.agent.tools.dsl import DSLToolHandler
from paranet.agent.tools.topology import TopologyToolHandler
from paranet.agent.tools.file import FileToolHandler
from paranet.agent.tools.code_exec import CodeExecToolHandler
from paranet.agent.tools.db import DBToolHandler
from paranet.agent.tools.project import ProjectToolHandler
from paranet.agent.tools.deploy import DeployToolHandler
from paranet.agent.tools.monitor import MonitorToolHandler
from paranet.agent.tools.web import WebToolHandler
from paranet.agent.tools.device_legend import DeviceLegendToolHandler

__all__ = [
    "BaseTool",
    "ToolResult",
    "DSLToolHandler",
    "TopologyToolHandler",
    "FileToolHandler",
    "CodeExecToolHandler",
    "DBToolHandler",
    "ProjectToolHandler",
    "DeployToolHandler",
    "MonitorToolHandler",
    "WebToolHandler",
    "DeviceLegendToolHandler",
]
