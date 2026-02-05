// 拓扑相关类型定义

export interface Topology {
  id: string
  name: string
  description?: string
  nodes: TopologyNode[]
  links: TopologyLink[]
  createdAt: string
  updatedAt: string
}

export interface TopologyNode {
  id: string
  name: string
  type: NodeType
  position: { x: number; y: number }
  properties: Record<string, unknown>
  config?: NodeConfig
}

export type NodeType = 
  | 'switch' 
  | 'router' 
  | 'host' 
  | 'controller' 
  | 'server' 
  | 'p4_switch'

export interface NodeConfig {
  ip?: string
  port?: number
  protocol?: string
  [key: string]: unknown
}

export interface TopologyLink {
  id: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
  bandwidth?: number
  delay?: number
  properties?: Record<string, unknown>
}

export interface TopologyCreateRequest {
  name: string
  description?: string
  nodes?: TopologyNode[]
  links?: TopologyLink[]
}

export interface TopologyUpdateRequest {
  name?: string
  description?: string
  nodes?: TopologyNode[]
  links?: TopologyLink[]
}
