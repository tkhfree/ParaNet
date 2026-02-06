import mitt, { type Emitter } from 'mitt'
import type {
  DeviceElement,
  IDevice,
  ILink,
  ITopology,
  ITopologyDevice,
  Topology,
  TopologyEvents,
} from '@/model/topology'
import { topologyToX6, x6ToTopology } from '@/model/topology'
import { message } from 'antd'
import { topologyApi } from '@/api/topology'
import { BUILT_IN_DEVICES } from '../config'
import { GraphManager } from './graph-manager'

export class Editor {
  container: HTMLDivElement
  graphManager: GraphManager
  bus: Emitter<TopologyEvents>
  autoSave: boolean
  devices: DeviceElement[]

  /** 当前打开的拓扑元信息（open 时写入，保存时用于 x6ToTopology） */
  _meta?: { id: string; name: string; createdAt: string; updatedAt: string }

  constructor(container: HTMLDivElement) {
    this.container = container
    this.graphManager = new GraphManager(this)
    this.bus = mitt<TopologyEvents>()
    this.autoSave = true
    this.devices = [...BUILT_IN_DEVICES]
  }

  getDevice(deviceModel: string): DeviceElement | undefined {
    return this.devices.find((item) => item.deviceModel === deviceModel)
  }

  async open(id: string) {
    this.clear()
    const res = await topologyApi.getById(id)
    const t = res.data as Topology
    this._meta = { id: t.id, name: t.name, createdAt: t.createdAt, updatedAt: t.updatedAt }
    const it = topologyToX6(t)
    this.rebuild(it)
    this.bus.emit('GRAPH_DESERIALIZE')
  }

  deserialize(project: ITopology) {
    if (project.graph) {
      this.graphManager.deserialize(project.graph)
    }
    this.rebuild(project)
  }

  serialize(): ITopology {
    const graph = this.graphManager.serialize()
    const devices = graph.nodes.map((n) => (n.data as ITopologyDevice).设备名称)
    const links = graph.edges.map((e) => e.data as ILink).filter(Boolean)
    const deviceStaticInfo: Record<string, ITopologyDevice> = {}
    graph.nodes.forEach((n) => {
      const d = n.data as ITopologyDevice
      deviceStaticInfo[d.设备名称] = d
    })
    return { devices, links, deviceStaticInfo, graph: undefined }
  }

  rebuild(project: ITopology) {
    if (!project.deviceStaticInfo) return
    const excludes = ['controller', 'server', 'host']
    Object.entries(project.deviceStaticInfo).forEach(([key, dev]) => {
      dev.设备名称 = key
    })
    const sorted = Object.values(project.deviceStaticInfo).sort((a) => {
      const d = this.getDevice(a.设备型号)
      return excludes.includes(d?.deviceType ?? '') ? 1 : -1
    })
    sorted.forEach((item) => this.graphManager.addDevice(item))
    project.links.forEach((link) => this.graphManager.addEdge(link))
    setTimeout(() => this.graphManager.showPorts(false), 100)
    this.graphManager.graph.centerContent()
  }

  clear() {
    const prev = this.autoSave
    this.autoSave = false
    this.graphManager.clear()
    this.autoSave = prev
  }

  undo() {
    this.graphManager.undo()
  }

  redo() {
    this.graphManager.redo()
  }

  addDevice(device: IDevice) {
    const data = this.createDevice(device)
    if (this.graphManager.getDevice(data.设备名称)) {
      message.info(`设备名称重复: ${data.设备名称}`)
      return
    }
    this.graphManager.addDevice(data)
  }

  addLink(link: ILink) {
    if (this.graphManager.getEdge(link.link)) {
      message.info(`连线名称重复: ${link.link}`)
      return
    }
    this.graphManager.addEdge(link)
  }

  editLink(id: string, link: ILink) {
    if (id !== link.link && this.graphManager.getEdge(link.link)) {
      message.info('连线名称重复')
      return
    }
    this.graphManager.updateEdge(id, link)
  }

  dispose() {
    this.graphManager.dispose()
  }

  createDevice(device: IDevice): ITopologyDevice {
    const { deviceClass, deviceName, deviceForm, portForm, capacity, rate, system, ssd } = device
    return {
      设备名称: deviceName,
      设备型号: deviceClass,
      设备形态: deviceForm ?? '',
      端口形态: portForm ?? '',
      交换容量: capacity ?? '',
      包转发率: rate ?? '',
      CPU系统: system ?? '',
      SSD: ssd ?? '',
    }
  }

  checkPortExit(deviceName: string, port: string, exclude?: string): boolean {
    const edges = this.graphManager.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const el = edges[i]
      const link = el.data as ILink
      if (link.link === exclude) continue
      const { src, dst } = link
      if (
        (src.device === deviceName && src.port === port) ||
        (dst.device === deviceName && dst.port === port)
      ) {
        return true
      }
    }
    return false
  }

  /** 将当前画布序列化为 API 所需的 nodes/links，用于保存 */
  toApiPayload(): { nodes: Topology['nodes']; links: Topology['links'] } {
    const graph = this.graphManager.serialize()
    const meta = this._meta
    if (!meta) return { nodes: [], links: [] }
    const top = x6ToTopology(
      meta.id,
      meta.name,
      {
        nodes: graph.nodes.map((n) => ({ data: n.data as ITopologyDevice, position: () => n.getPosition() })),
        edges: graph.edges.map((e) => ({ data: e.data as ILink })),
      },
      meta.createdAt,
      meta.updatedAt
    )
    return { nodes: top.nodes, links: top.links }
  }
}
