import { compact } from '@renzp/utils'
import mitt, { Emitter } from 'mitt'
import { DeviceElement, Events, IDevice, ILink, ITopology, ITopologyDevice } from '../../types'
import { GraphManager } from './graph-manager'
import { getFileDetail } from '@/api/file'
import { getElements } from '@/api/element'
import { message } from 'antd'

export class Editor {
  container: HTMLDivElement
  graphManager: GraphManager

  bus: Emitter<Events>

  autoSave: boolean

  devices: DeviceElement[]

  constructor(container: HTMLDivElement) {
    this.container = container

    this.graphManager = new GraphManager(this)

    this.bus = mitt<Events>()

    this.autoSave = true

    this.devices = []
  }

  async init() {
    const response = await getElements(1)

    this.devices = response.data
  }

  getDevice(deviceModel: string) {
    return this.devices.find(item => item.deviceModel === deviceModel)
  }

  async open(id: string) {
    this.clear()

    await this.init()

    const response = await getFileDetail(id)

    if (response.code === 0) {
      this.deserialize(JSON.parse(response.data))
    }

    this.bus.emit('GRAPH_DESERIALIZE')
  }

  deserialize(project: ITopology) {
    if (project.graph) {
      this.graphManager.deserialize(project.graph)
    }

    this.rebuild(project)
  }

  serialize() {
    const graph = this.graphManager.serialize()

    const devices = graph.nodes.map(item => item.data.设备名称)

    const links = compact(graph.edges.map(item => item.data))

    const deviceStaticInfo: Record<string, ITopologyDevice> = {}

    graph.nodes.forEach(item => (deviceStaticInfo[item.data.设备名称] = item.data))

    return { devices, links, deviceStaticInfo, graph }
  }

  rebuild(project: ITopology) {
    if (!project.deviceStaticInfo) return

    // 根据图纸数据重建拓扑图
    const excludes = ['控制器', '服务器', '客户端']

    Object.entries(project.deviceStaticInfo).forEach(item => (item[1].设备名称 = item[0]))

    Object.values(project.deviceStaticInfo)
      .sort(a => {
        const device1 = this.getDevice(a.设备型号)

        if (excludes.includes(device1?.deviceType || '')) {
          return 1
        }
        return -1
      })
      .forEach(item => this.graphManager.addDevice(item))

    for (let i = 0; i < project.links.length; i++) {
      const link = project.links[i]

      this.graphManager.addEdge(link)
    }

    setTimeout(() => this.graphManager.showPorts(false), 100)

    this.graphManager.graph.centerContent()
  }

  clear() {
    const autoSave = this.autoSave
    this.autoSave = false
    this.graphManager.clear()
    this.autoSave = autoSave
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
      设备形态: deviceForm,
      端口形态: portForm,
      交换容量: capacity,
      包转发率: rate,
      CPU系统: system,
      SSD: ssd,
    }
  }

  checkPortExit(deviceName: string, port: string, exclude?: string) {
    const edges = this.graphManager.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const element = edges[i]

      if (element.data.link === exclude) continue

      const { src, dst } = element.data as ILink

      if (
        (src.device === deviceName && src.port === port) ||
        (dst.device === deviceName && dst.port === port)
      ) {
        return true
      }
    }

    return false
  }
}
