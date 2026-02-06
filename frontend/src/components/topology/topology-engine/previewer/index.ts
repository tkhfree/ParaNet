import mitt, { type Emitter } from 'mitt'
import type { DeviceElement, ITopology, Topology, TopologyEvents } from '@/model/topology'
import { topologyToX6 } from '@/model/topology'
import { topologyApi } from '@/api/topology'
import { BUILT_IN_DEVICES } from '../config'
import { GraphManager } from './graph-manager'

export class Previewer {
  container: HTMLDivElement
  graphManager: GraphManager
  bus: Emitter<TopologyEvents>
  devices: DeviceElement[]

  constructor(container: HTMLDivElement, isPopup = false) {
    this.container = container
    this.graphManager = new GraphManager(this, isPopup)
    this.bus = mitt<TopologyEvents>()
    this.devices = [...BUILT_IN_DEVICES]
  }

  getDevice(deviceModel: string): DeviceElement | undefined {
    return this.devices.find((item) => item.deviceModel === deviceModel)
  }

  async open(id: string) {
    this.clear()
    const res = await topologyApi.getById(id)
    const t = res.data as Topology
    const it = topologyToX6(t)
    this.rebuild(it)
  }

  deserialize(project: ITopology) {
    if (project.graph) {
      this.graphManager.deserialize(project.graph)
    }
    this.rebuild(project)
  }

  rebuild(project: ITopology) {
    if (!project.deviceStaticInfo) return
    const excludes = ['controller', 'server', 'host']
    Object.entries(project.deviceStaticInfo).forEach(([key, dev]) => {
      dev.设备名称 = key
    })
    Object.values(project.deviceStaticInfo)
      .sort((a) => {
        const d = this.getDevice(a.设备型号)
        return excludes.includes(d?.deviceType ?? '') ? 1 : -1
      })
      .forEach((item) => this.graphManager.addDevice(item))
    project.links.forEach((link) => this.graphManager.addEdge(link))
    setTimeout(() => this.graphManager.showPorts(false), 100)
    this.graphManager.graph.centerContent()
  }

  clear() {
    this.graphManager.clear()
  }

  dispose() {
    this.graphManager.dispose()
  }
}
