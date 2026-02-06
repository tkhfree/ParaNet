// 拓扑相关类型定义（API 与 X6 引擎共用）

import type { Model } from '@antv/x6' // 仅用于 ITopology.graph 类型

/** API 层拓扑 */
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

// ---------- X6 拓扑引擎内部格式 ----------

export interface IPoint {
  device: string
  port: string
}

export interface ILink {
  link: string
  src: IPoint
  dst: IPoint
  bandwidth: number
}

/** 设备静态信息（与 X6 节点 data 一致） */
export interface ITopologyDevice {
  设备名称: string
  设备型号: string
  设备形态: string
  端口形态: string
  交换容量: string
  包转发率: string
  CPU系统: string
  SSD: string
}

export interface ITopology {
  devices: string[]
  links: ILink[]
  deviceStaticInfo: Record<string, ITopologyDevice>
  graph?: Model.FromJSONData
}

/** 意图编程表单设备（新建节点） */
export interface IDevice {
  deviceName: string
  deviceClass: string
  deviceForm: string
  portForm: string
  capacity: string
  rate: string
  system: string
  ssd: string
}

/** 拓扑引擎设备图元（侧边栏/设备库） */
export interface DeviceElement {
  id: string
  deviceType: string
  deviceModel: string
  picturePath: string
}

/** 事件：连线新增 */
export interface ILinkAddedEvent {
  source: string
  target: string
}

/** 事件：节点点击 */
export interface INodeClickEvent {
  data: ITopologyDevice
  x: number
  y: number
}

/** 事件：边点击 */
export interface IEdgeClickEvent {
  data: ILink
  x: number
  y: number
}

/** 拓扑引擎总线事件类型 */
export type TopologyEvents = {
  GRAPH_DESERIALIZE: undefined
  LINK_ADDED: ILinkAddedEvent
  CELL_ADDED: undefined
  CELL_CHANGED: undefined
  CELL_REMOVED: undefined
  NODE_CLICK: INodeClickEvent
  EDGE_CLICK: IEdgeClickEvent
  BLANK_CLICK: undefined
}

/** API Topology -> X6 ITopology */
export function topologyToX6(t: Topology): ITopology {
  const devices = t.nodes.map(n => n.name)
  const deviceStaticInfo: Record<string, ITopologyDevice> = {}
  t.nodes.forEach(n => {
    deviceStaticInfo[n.name] = {
      设备名称: n.name,
      设备型号: n.type,
      设备形态: (n.properties?.deviceForm as string) ?? '',
      端口形态: (n.properties?.portForm as string) ?? '',
      交换容量: (n.properties?.capacity as string) ?? '',
      包转发率: (n.properties?.rate as string) ?? '',
      CPU系统: (n.properties?.system as string) ?? '',
      SSD: (n.properties?.ssd as string) ?? '',
    }
  })
  const links: ILink[] = t.links.map(l => ({
    link: l.id,
    src: { device: l.source, port: l.sourcePort ?? '' },
    dst: { device: l.target, port: l.targetPort ?? '' },
    bandwidth: l.bandwidth ?? 0,
  }))
  return { devices, links, deviceStaticInfo, graph: undefined }
}

/** X6 序列化结果 + 元信息 -> API Topology（nodes/edges 为 X6 Node/Edge 实例） */
export function x6ToTopology(
  id: string,
  name: string,
  it: {
    nodes: Array<{ data: ITopologyDevice; position: () => { x: number; y: number } }>
    edges: Array<{ data: ILink }>
  },
  createdAt: string,
  updatedAt: string
): Topology {
  const nodes: TopologyNode[] = it.nodes.map(n => {
    const d = n.data
    const pos = n.position()
    return {
      id: d.设备名称,
      name: d.设备名称,
      type: d.设备型号 as NodeType,
      position: { x: pos.x, y: pos.y },
      properties: {
        deviceForm: d.设备形态,
        portForm: d.端口形态,
        capacity: d.交换容量,
        rate: d.包转发率,
        system: d.CPU系统,
        ssd: d.SSD,
      },
    }
  })
  const links: TopologyLink[] = it.edges
    .filter(e => e.data)
    .map(e => {
      const d = e.data
      return {
        id: d.link,
        source: d.src.device,
        target: d.dst.device,
        sourcePort: d.src.port || undefined,
        targetPort: d.dst.port || undefined,
        bandwidth: d.bandwidth,
      }
    })
  return { id, name, nodes, links, createdAt, updatedAt }
}
