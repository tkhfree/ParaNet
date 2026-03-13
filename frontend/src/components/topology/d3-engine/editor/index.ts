/**
 * D3 拓扑编辑器引擎
 */

import mitt, { type Emitter } from 'mitt'
import type { Topology, IDevice, ILink, DeviceElement } from '@/model/topology'
import type { NodeType } from '../types'
import { topologyApi } from '@/api/topology'
import type { D3Node, D3Link, D3Graph } from '../types'
import {
  topologyToD3,
  d3ToTopologyPayload,
  createD3Node,
} from '../utils/converters'

/** D3 编辑器事件 */
export type D3EditorEvents = {
  NODE_CLICK: { node: D3Node; x: number; y: number }
  NODE_CONTEXTMENU: { node: D3Node; x: number; y: number }
  LINK_CLICK: { link: D3Link; x: number; y: number }
  LINK_CREATE_REQUESTED: { source?: string; target?: string } | undefined
  BLANK_CLICK: undefined
  GRAPH_CHANGED: undefined
  LINK_ADDED: { source: string; target: string }
}

/** 内置设备列表 */
const BUILT_IN_DEVICES: DeviceElement[] = [
  { id: '1', deviceType: 'switch', deviceModel: 'switch', picturePath: '' },
  { id: '2', deviceType: 'router', deviceModel: 'router', picturePath: '' },
  { id: '3', deviceType: 'host', deviceModel: 'host', picturePath: '' },
  { id: '4', deviceType: 'controller', deviceModel: 'controller', picturePath: '' },
  { id: '5', deviceType: 'server', deviceModel: 'server', picturePath: '' },
  { id: '6', deviceType: 'p4_switch', deviceModel: 'p4_switch', picturePath: '' },
]

export class D3Editor {
  container: HTMLDivElement
  bus: Emitter<D3EditorEvents>
  devices: DeviceElement[]
  autoSave: boolean

  /** 当前拓扑数据 */
  private graphData: D3Graph

  /** 选中的节点 ID */
  selectedNodeId: string | null = null

  constructor(container: HTMLDivElement) {
    this.container = container
    this.bus = mitt<D3EditorEvents>()
    this.devices = [...BUILT_IN_DEVICES]
    this.autoSave = true
    this.graphData = { nodes: [], links: [] }
  }

  /** 获取当前图数据 */
  get graph(): D3Graph {
    return this.graphData
  }

  /** 获取节点列表 */
  get nodes(): D3Node[] {
    return this.graphData.nodes
  }

  /** 获取连线列表 */
  get links(): D3Link[] {
    return this.graphData.links
  }

  /** 获取设备型号信息 */
  getDevice(deviceModel: string): DeviceElement | undefined {
    return this.devices.find((d) => d.deviceModel === deviceModel)
  }

  /** 从 API 加载拓扑 */
  async open(id: string): Promise<void> {
    this.clear()
    const res = await topologyApi.getById(id)
    const t = res.data as Topology
    this.graphData = topologyToD3(t)
    this.emitGraphChanged()
  }

  /** 设置图数据（用于 React 状态更新） */
  setGraph(graph: D3Graph): void {
    this.graphData = graph
    this.emitGraphChanged()
  }

  /** 清空图 */
  clear(): void {
    this.graphData = { nodes: [], links: [] }
    this.selectedNodeId = null
    this.emitGraphChanged()
  }

  /** 添加设备节点 */
  addDevice(device: IDevice, position?: { x: number; y: number }): D3Node | null {
    const type = device.deviceClass as NodeType
    const node = createD3Node(device.deviceName, type, position)

    // 检查名称重复
    if (this.getNodeByName(device.deviceName)) {
      return null
    }

    // 设置节点属性
    node.properties = {
      deviceForm: device.deviceForm,
      portForm: device.portForm,
      capacity: device.capacity,
      rate: device.rate,
      system: device.system,
      ssd: device.ssd,
    }

    this.graphData = {
      ...this.graphData,
      nodes: [...this.graphData.nodes, node],
    }
    this.emitGraphChanged()
    return node
  }

  /** 添加连线 */
  addLink(link: ILink): D3Link | null {
    // 检查连线是否已存在
    if (this.getLinkById(link.link)) {
      return null
    }

    // 检查源和目标节点是否存在
    const sourceNode = this.getNodeByName(link.src.device)
    const targetNode = this.getNodeByName(link.dst.device)
    if (!sourceNode || !targetNode) {
      return null
    }

    // 检查是否已经连接
    if (this.isLinked(link.src.device, link.dst.device)) {
      return null
    }

    const d3Link: D3Link = {
      id: link.link,
      source: sourceNode.id,
      target: targetNode.id,
      sourcePort: link.src.port,
      targetPort: link.dst.port,
      bandwidth: link.bandwidth,
    }

    this.graphData = {
      ...this.graphData,
      links: [...this.graphData.links, d3Link],
    }
    this.emitGraphChanged()
    return d3Link
  }

  /** 更新设备节点 */
  updateDevice(id: string, data: Partial<D3Node>): boolean {
    const nodeIndex = this.graphData.nodes.findIndex((n) => n.id == id)
    if (nodeIndex === -1) return false

    const nextNodes = [...this.graphData.nodes]
    nextNodes[nodeIndex] = {
      ...nextNodes[nodeIndex],
      ...data,
    }
    this.graphData = {
      ...this.graphData,
      nodes: nextNodes,
    }

    this.emitGraphChanged()
    return true
  }

  /** 删除节点 */
  removeNode(id: string): boolean {
    const nextNodes = this.graphData.nodes.filter((n) => n.id !== id)
    if (nextNodes.length === this.graphData.nodes.length) return false

    const nextLinks = this.graphData.links.filter(
      (l) =>
        (typeof l.source === 'string' ? l.source : l.source.id) !== id &&
        (typeof l.target === 'string' ? l.target : l.target.id) !== id
    )
    this.graphData = {
      ...this.graphData,
      nodes: nextNodes,
      links: nextLinks,
    }
    this.emitGraphChanged()
    return true
  }

  /** 删除连线 */
  removeLink(id: string): boolean {
    const nextLinks = this.graphData.links.filter((l) => l.id !== id)
    if (nextLinks.length === this.graphData.links.length) return false

    this.graphData = {
      ...this.graphData,
      links: nextLinks,
    }
    this.emitGraphChanged()
    return true
  }

  /** 更新连线 */
  updateLink(id: string, data: Partial<D3Link>): boolean {
    const linkIndex = this.graphData.links.findIndex((l) => l.id === id)
    if (linkIndex === -1) return false

    const nextLinks = [...this.graphData.links]
    nextLinks[linkIndex] = {
      ...nextLinks[linkIndex],
      ...data,
    }
    this.graphData = {
      ...this.graphData,
      links: nextLinks,
    }
    this.emitGraphChanged()
    return true
  }

  /** 根据 ID 获取节点 */
  getNodeById(id: string): D3Node | undefined {
    return this.graphData.nodes.find((n) => n.id === id)
  }

  /** 根据名称获取节点 */
  getNodeByName(name: string): D3Node | undefined {
    return this.graphData.nodes.find((n) => n.name === name)
  }

  /** 根据 ID 获取连线 */
  getLinkById(id: string): D3Link | undefined {
    return this.graphData.links.find((l) => l.id === id)
  }

  /** 检查两个节点是否已连接 */
  isLinked(sourceName: string, targetName: string): boolean {
    const sourceNode = this.getNodeByName(sourceName)
    const targetNode = this.getNodeByName(targetName)
    if (!sourceNode || !targetNode) return false

    return this.graphData.links.some((l) => {
      const src = typeof l.source === 'string' ? l.source : l.source.id
      const tgt = typeof l.target === 'string' ? l.target : l.target.id
      return (
        (src === sourceNode.id && tgt === targetNode.id) ||
        (src === targetNode.id && tgt === sourceNode.id)
      )
    })
  }

  /** 检查端口是否已被使用 */
  checkPortExit(deviceName: string, port: string, excludeLinkId?: string): boolean {
    const node = this.getNodeByName(deviceName)
    if (!node) return false

    return this.graphData.links.some((l) => {
      if (excludeLinkId && l.id === excludeLinkId) return false

      const srcId = typeof l.source === 'string' ? l.source : l.source.id
      const tgtId = typeof l.target === 'string' ? l.target : l.target.id
      const srcPort = l.sourcePort
      const tgtPort = l.targetPort

      return (
        (srcId === node.id && srcPort === port) ||
        (tgtId === node.id && tgtPort === port)
      )
    })
  }

  /** 转换为 API 保存格式 */
  toApiPayload(): { nodes: Topology['nodes']; links: Topology['links'] } {
    return d3ToTopologyPayload(this.graphData)
  }

  /** 选中节点 */
  selectNode(id: string | null): void {
    this.selectedNodeId = id
  }

  /** 发出图变更事件 */
  private emitGraphChanged(): void {
    this.bus.emit('GRAPH_CHANGED', undefined)
  }

  /** 销毁 */
  dispose(): void {
    this.graphData = { nodes: [], links: [] }
    this.selectedNodeId = null
    this.bus.all.clear()
  }
}
