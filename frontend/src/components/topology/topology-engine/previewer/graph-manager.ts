import '../config'

import { Graph, Model } from '@antv/x6'
import type { ITopologyDevice, ILink, DeviceElement } from '@/model/topology'
import { getMousePosition } from '../utils'
import { Previewer } from './index'

const padding1 = { left: 40, right: 40, top: 40, bottom: 40 }
const padding2 = { left: 10, right: 10, top: 10, bottom: 10 }

export class GraphManager {
  previewer: Previewer
  graph: Graph
  isPopup: boolean

  constructor(previewer: Previewer, isPopup = false) {
    this.previewer = previewer
    this.isPopup = isPopup
    this.graph = new Graph({
      container: previewer.container,
      background: { color: '#1e1e1e' },
      interacting: false,
      autoResize: true,
      panning: { enabled: true, modifiers: 'shift' },
      mousewheel: { enabled: true, maxScale: 2, minScale: 0.5 },
      grid: {
        visible: true,
        size: 40,
        type: 'mesh',
        args: { color: '#28292C', thickness: 2 },
      },
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        allowNode: false,
        highlight: true,
        allowEdge: false,
        allowMulti: true,
        anchor: 'center',
        connectionPoint: 'anchor',
        createEdge: () => {
          const edge = this.graph.createEdge({ shape: 'edge' })
          edge.attr({
            line: {
              stroke: '#fff',
              strokeWidth: 1,
              sourceMarker: { name: 'circle', r: 2 },
              targetMarker: { name: 'circle', r: 2 },
            },
          })
          return edge
        },
      },
      highlighting: {
        magnetAvailable: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#A4DEB1', strokeWidth: 4 } },
        },
        magnetAdsorbed: {
          name: 'stroke',
          args: { attrs: { fill: '#fff', stroke: '#31d0c6', strokeWidth: 4 } },
        },
      },
    })
    this.bindEvents()
  }

  showPorts = (show: boolean) => {
    const ports = this.previewer.container.querySelectorAll('.x6-port-body') as NodeListOf<SVGElement>
    for (let i = 0; i < ports.length; i += 1) {
      ports[i].style.visibility = show ? 'visible' : 'hidden'
    }
  }

  bindEvents() {
    this.graph.on('node:click', ({ e, cell }) => {
      const [x, y] = getMousePosition(this.previewer.container, e.clientX, e.clientY)
      this.previewer.bus.emit('NODE_CLICK', { data: cell.data as ITopologyDevice, x, y })
    })
    this.graph.on('edge:click', ({ e, cell }) => {
      const [x, y] = getMousePosition(this.previewer.container, e.clientX, e.clientY)
      this.previewer.bus.emit('EDGE_CLICK', { data: cell.data as ILink, x, y })
    })
    this.graph.on('blank:click', () => {
      this.previewer.bus.emit('BLANK_CLICK')
    })
    this.graph.on('render:done', () => {
      this.graph.resize()
      this.graph.zoomToFit({ padding: this.isPopup ? padding2 : padding1 })
      this.graph.centerContent()
      this.showPorts(false)
    })
  }

  clear() {
    this.graph.clearCells()
    this.graph.cleanHistory()
  }

  deserialize(project: Model.FromJSONData) {
    this.graph.fromJSON(project)
    if (this.isPopup) {
      this.graph.getNodes().forEach((node) => {
        node.setProp('size', { width: 114, height: 75 })
        node.setAttrs({ label: { fill: 'transparent' } })
      })
    }
  }

  dispose() {
    this.graph.dispose()
  }

  getDevice(id: string) {
    const nodes = this.graph.getNodes()
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i].data as ITopologyDevice
      if (el.设备名称 === id) return nodes[i]
    }
  }

  addDevice(data: ITopologyDevice) {
    if (this.getDevice(data.设备名称)) return
    const device = this.previewer.getDevice(data.设备型号)
    if (!device) return
    const position = this.getDevicePosition(this.previewer.devices, device.deviceType)
    const node = this.graph.createNode({
      shape: 'Device',
      ...position,
      label: data.设备名称,
      attrs: { img: { 'xlink:href': device.picturePath } },
      data,
    })
    if (this.isPopup) {
      node.setProp('size', { width: 114, height: 75 })
      node.setAttrs({ label: { fill: 'transparent' } })
    }
    this.graph.addNode(node)
    return node
  }

  getEdge(link: string) {
    const edges = this.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const el = edges[i].data as ILink
      if (el.link === link) return edges[i]
    }
  }

  addEdge(link: ILink) {
    if (this.getEdge(link.link)) return
    const { src, dst } = link
    const source = this.getDevice(src.device)
    const target = this.getDevice(dst.device)
    if (!source || !target) return
    const device1 = this.previewer.getDevice((source.data as ITopologyDevice).设备型号)
    const device2 = this.previewer.getDevice((target.data as ITopologyDevice).设备型号)
    if (!device1 || !device2) return
    let stroke = '#07ccfa'
    if (device1.deviceType === 'controller' || device2.deviceType === 'controller') {
      stroke = '#fa7207'
    }
    const edge = this.graph.addEdge({ source, target })
    edge.attr({
      line: {
        stroke,
        strokeWidth: 1,
        sourceMarker: { name: 'circle', r: 1 },
        targetMarker: { name: 'circle', r: 1 },
      },
    })
    edge.data = link
    edge.toBack()
    return edge
  }

  getDevicePosition(devices: DeviceElement[], deviceType: string) {
    const excludes = ['controller', 'server', 'host']
    const deviceModels = devices
      .filter((item) => excludes.includes(item.deviceType))
      .map((item) => item.deviceModel)
    const nodes = this.graph.getNodes().filter((n) => !deviceModels.includes((n.data as ITopologyDevice).设备型号))

    if (deviceType === 'controller') {
      if (nodes.length) {
        const box = this.graph.getCellsBBox(nodes)
        if (box) return { x: (box.topLeft.x + box.topRight.x) * 0.5, y: box.topRight.y - 200 }
        return { x: 0, y: -200 }
      }
      return { x: 0, y: -200 }
    }
    if (deviceType === 'server') {
      if (nodes.length) {
        const box = this.graph.getCellsBBox(nodes)
        if (box) return { x: box.topRight.x + 200, y: (box.topRight.y + box.bottomRight.y) * 0.5 }
        return { x: 200, y: 0 }
      }
      return { x: 200, y: 0 }
    }
    if (deviceType === 'host') {
      if (nodes.length) {
        const box = this.graph.getCellsBBox(nodes)
        if (box) return { x: box.topLeft.x - 200, y: (box.topLeft.y + box.bottomLeft.y) * 0.5 }
        return { x: -200, y: 0 }
      }
      return { x: -200, y: 0 }
    }
    if (nodes.length) {
      const boxes = nodes.map((item) => item.getBBox())
      boxes.sort((a, b) => a.y - b.y)
      boxes.sort((a, b) => a.x - b.x)
      const firstBox = boxes[0]
      const targetBox = firstBox.clone()
      let finished = false
      while (!finished) {
        let success = true
        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i]
          if (box.containsRect(targetBox)) {
            const offset = targetBox.x - firstBox.x
            if (offset < 800) {
              targetBox.translate(114 + 100, 0)
            } else {
              targetBox.x = firstBox.x
              targetBox.translate(0, 100 + 100)
            }
            success = false
            break
          }
        }
        if (success) finished = true
      }
      return { x: targetBox.x, y: targetBox.y }
    }
    return { x: 0, y: 0 }
  }
}
