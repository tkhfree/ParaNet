from typing import Any, List
from pydantic import BaseModel


class Position(BaseModel):
    x: float
    y: float


class NodeConfig(BaseModel):
    ip: str | None = None
    port: int | None = None
    protocol: str | None = None


class TopologyNode(BaseModel):
    id: str
    name: str
    type: str
    position: Position
    properties: dict[str, Any] = {}
    config: NodeConfig | None = None


class TopologyLink(BaseModel):
    id: str
    source: str
    target: str
    sourcePort: str | None = None
    targetPort: str | None = None
    bandwidth: int | None = None
    delay: int | None = None
    properties: dict[str, Any] | None = None


class Topology(BaseModel):
    id: str
    name: str
    description: str | None = None
    nodes: List[TopologyNode] = []
    links: List[TopologyLink] = []
    createdAt: str
    updatedAt: str


class TopologyCreateRequest(BaseModel):
    name: str
    description: str | None = None
    nodes: List[TopologyNode] | None = None
    links: List[TopologyLink] | None = None


class TopologyUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    nodes: List[TopologyNode] | None = None
    links: List[TopologyLink] | None = None


class PaginatedTopology(BaseModel):
    records: List[dict]
    total: int
    pageNo: int
    pageSize: int
