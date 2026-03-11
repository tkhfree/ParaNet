/**
 * 数据转换工具
 * API Topology <-> D3 Graph
 */

import type { Topology, TopologyNode, TopologyLink, NodeType } from '@/model/topology'
import type { D3Node, D3Link, D3Graph } from '../types'

/** 生成唯一 ID */
export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** 生成连线 ID */
export function generateLinkId(): string {
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** API TopologyNode -> D3Node */
export function topologyNodeToD3(node: TopologyNode, index: number): D3Node {
  // 如果没有位置，则根据索引计算初始位置（圆形布局）
  const hasPosition = node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
  let x = 0
  let y = 0

  if (hasPosition) {
    x = node.position.x
    y = node.position.y
  } else {
    // 使用圆形布局作为初始位置
    const angle = (index / 10) * 2 * Math.PI
    const radius = 200
    x = radius * Math.cos(angle)
    y = radius * Math.sin(angle)
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x,
    y,
    properties: node.properties || {},
    config: node.config,
  }
}

/** API TopologyLink -> D3Link */
export function topologyLinkToD3(link: TopologyLink): D3Link {
  return {
    id: link.id,
    source: link.source,
    target: link.target,
    sourcePort: link.sourcePort,
    targetPort: link.targetPort,
    bandwidth: link.bandwidth,
    delay: link.delay,
    properties: link.properties,
  }
}

/** D3Node -> API TopologyNode */
export function d3NodeToTopologyNode(node: D3Node): TopologyNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    position: { x: node.x, y: node.y },
    properties: node.properties || {},
    config: node.config,
  }
}

/** D3Link -> API TopologyLink */
export function d3LinkToTopologyLink(link: D3Link): TopologyLink {
  const source = typeof link.source === 'string' ? link.source : link.source.id
  const target = typeof link.target === 'string' ? link.target : link.target.id

  return {
    id: link.id,
    source,
    target,
    sourcePort: link.sourcePort,
    targetPort: link.targetPort,
    bandwidth: link.bandwidth,
    delay: link.delay,
    properties: link.properties,
  }
}

/** API Topology -> D3 Graph */
export function topologyToD3(topology: Topology): D3Graph {
  return {
    nodes: topology.nodes.map((n, i) => topologyNodeToD3(n, i)),
    links: topology.links.map(topologyLinkToD3),
  }
}

/** D3 Graph -> API Payload (nodes/links) */
export function d3ToTopologyPayload(
  graph: D3Graph
): { nodes: TopologyNode[]; links: TopologyLink[] } {
  return {
    nodes: graph.nodes.map(d3NodeToTopologyNode),
    links: graph.links.map(d3LinkToTopologyLink),
  }
}

/** 创建新的 D3 节点 */
export function createD3Node(
  name: string,
  type: NodeType,
  position?: { x: number; y: number }
): D3Node {
  return {
    id: generateId(),
    name,
    type,
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    properties: {},
  }
}

/** 创建新的 D3 连线 */
export function createD3Link(
  sourceId: string,
  targetId: string,
  sourcePort?: string,
  targetPort?: string
): D3Link {
  return {
    id: generateLinkId(),
    source: sourceId,
    target: targetId,
    sourcePort,
    targetPort,
    bandwidth: 1000,
  }
}

/** 获取节点类型 */
export function getNodeType(model: string): NodeType {
  const validTypes: NodeType[] = ['switch', 'router', 'host', 'controller', 'server', 'p4_switch']
  if (validTypes.includes(model as NodeType)) {
    return model as NodeType
  }
  return 'switch' // 默认类型
}
