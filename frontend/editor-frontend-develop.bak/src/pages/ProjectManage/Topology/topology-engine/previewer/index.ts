import mitt, { Emitter } from 'mitt'
import { DeviceElement, Events, ITopology } from '../../types'
import { GraphManager } from './graph-manager'
import { getFileDetail } from '@/api/file'
import { getElements } from '@/api/element'

export class Previewer {
  container: HTMLDivElement
  graphManager: GraphManager
  bus: Emitter<Events>
  devices: DeviceElement[]

  constructor(container: HTMLDivElement, isPopup = false) {
    this.container = container

    this.graphManager = new GraphManager(this, isPopup)

    this.bus = mitt<Events>()

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
  }

  deserialize(project: ITopology) {
    if (project.graph) {
      this.graphManager.deserialize(project.graph)
    }
    this.rebuild(project)
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
      this.graphManager.addEdge(project.links[i])
    }

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
