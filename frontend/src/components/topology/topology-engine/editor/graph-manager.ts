import '../config'

import { Graph, Model } from '@antv/x6'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { message } from 'antd'
import type { ITopologyDevice, ILink, DeviceElement } from '@/model/topology'
import { getMousePosition } from '../utils'
import { Editor } from './index'

const padding = { left: 600, right: 40, top: 40, bottom: 40 }

export class GraphManager {
  editor: Editor
  graph: Graph

  onNodeClick?: (data: ITopologyDevice, x: number, y: number) => void
  onNodeContextClick?: (data: ITopologyDevice, x: number, y: number) => void
  onEdgeClick?: (data: ILink, x: number, y: number) => void
  onBlankClick?: () => void

  stopEvent = false

  constructor(editor: Editor) {
    this.editor = editor
    this.graph = new Graph({
      container: editor.container,
      background: { color: '#1e1e1e' },
      autoResize: true,
      panning: { enabled: true, modifiers: 'shift' },
      mousewheel: { enabled: true, maxScale: 2, minScale: 0.5 },
      grid: {
        visible: true,
        size: 40,
        type: 'mesh',
        args: {
          color: '#28292C',
          thickness: 2,
        },
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
              stroke: '#727586',
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
          args: {
            attrs: {
              fill: '#fff',
              stroke: '#A4DEB1',
              strokeWidth: 4,
            },
          },
        },
        magnetAdsorbed: {
          name: 'stroke',
          args: {
            attrs: {
              fill: '#fff',
              stroke: '#31d0c6',
              strokeWidth: 4,
            },
          },
        },
      },
    })

    this.graph
      .use(
        new Selection({
          enabled: true,
          showNodeSelectionBox: true,
          className: 'topology-selecting',
        })
      )
      .use(new Snapline())
      .use(new Keyboard())
      .use(new Clipboard())
      .use(new History())

    this.bindKeys()
    this.bindEvents()
  }

  bindKeys() {
    this.graph.bindKey(['meta+z', 'ctrl+z'], () => {
      if (this.graph.canUndo()) {
        this.editor.undo()
      }
      return false
    })
    this.graph.bindKey(['meta+shift+z', 'ctrl+shift+z'], () => {
      if (this.graph.canRedo()) {
        this.editor.redo()
      }
      return false
    })
    this.graph.bindKey(['meta+a', 'ctrl+a'], () => {
      const nodes = this.graph.getNodes()
      if (nodes.length) {
        this.graph.select(nodes)
      }
    })
    this.graph.bindKey('backspace', () => {
      const cells = this.graph.getSelectedCells()
      if (cells.length) {
        this.graph.removeCells(cells)
      }
    })
    this.graph.bindKey('delete', () => {
      const cells = this.graph.getSelectedCells()
      if (cells.length) {
        this.graph.removeCells(cells)
      }
    })
    this.graph.bindKey(['ctrl+1', 'meta+1'], () => {
      const zoom = this.graph.zoom()
      if (zoom < 1.5) {
        this.graph.zoom(0.1)
      }
    })
    this.graph.bindKey(['ctrl+2', 'meta+2'], () => {
      const zoom = this.graph.zoom()
      if (zoom > 0.5) {
        this.graph.zoom(-0.1)
      }
    })
  }

  showPorts = (show: boolean) => {
    const ports = this.editor.container.querySelectorAll('.x6-port-body') as NodeListOf<SVGElement>
    for (let i = 0; i < ports.length; i += 1) {
      ports[i].style.visibility = show ? 'visible' : 'hidden'
    }
  }

  bindEvents() {
    this.graph.on('node:mouseenter', () => {
      this.showPorts(true)
    })
    this.graph.on('node:mouseleave', () => {
      this.showPorts(false)
    })
    this.graph.on('edge:mouseenter', (event) => {
      this.stopEvent = true
      this.graph.disableHistory()
      event.edge.addTools({
        name: 'button-remove',
        args: { distance: '50%' },
      })
      this.stopEvent = false
      this.graph.enableHistory()
    })
    this.graph.on('edge:mouseleave', (event) => {
      this.stopEvent = true
      this.graph.disableHistory()
      event.edge.removeTools()
      this.stopEvent = false
      this.graph.enableHistory()
    })
    this.graph.on('node:click', ({ e, cell }) => {
      const [x, y] = getMousePosition(this.editor.container, e.clientX, e.clientY)
      this.onNodeClick?.(cell.data as ITopologyDevice, x, y)
      this.showPorts(true)
    })
    this.graph.on('node:contextmenu', ({ e, cell }) => {
      const [x, y] = getMousePosition(this.editor.container, e.clientX, e.clientY)
      this.onNodeContextClick?.(cell.data as ITopologyDevice, x, y)
    })
    this.graph.on('edge:click', ({ e, cell }) => {
      const [x, y] = getMousePosition(this.editor.container, e.clientX, e.clientY)
      this.onEdgeClick?.(cell.data as ILink, x, y)
    })
    this.graph.on('blank:click', () => {
      this.onBlankClick?.()
      this.showPorts(false)
    })
    this.graph.on('render:done', () => {
      this.graph.resize()
      this.graph.zoomToFit({ padding })
      this.graph.centerContent()
      this.showPorts(false)
    })
    this.graph.on('edge:connected', (event) => {
      if (!event.isNew) return
      const source = event.edge.getSourceCell()
      const target = event.edge.getTargetCell()
      if (!source || !target) return
      this.graph.removeEdge(event.edge)
      const data1 = source.data as ITopologyDevice
      const data2 = target.data as ITopologyDevice
      if (this.isLinked(data1.设备名称, data2.设备名称)) {
        message.info('设备已连接')
        return
      }
      this.editor.bus.emit('LINK_ADDED', { source: data1.设备名称, target: data2.设备名称 })
    })
    this.graph.on('cell:added', () => this.editor.bus.emit('CELL_ADDED'))
    this.graph.on('cell:removed', () => this.editor.bus.emit('CELL_REMOVED'))
    this.graph.on('cell:changed', () => !this.stopEvent && this.editor.bus.emit('CELL_CHANGED'))
  }

  undo() {
    this.graph.undo()
  }

  redo() {
    this.graph.redo()
  }

  clear() {
    this.graph.clearCells()
    this.graph.cleanHistory()
  }

  deserialize(project: Model.FromJSONData) {
    this.graph.fromJSON(project)
  }

  serialize() {
    const nodes = this.graph.getNodes()
    const edges = this.graph.getEdges().filter((item) => !!item.data)
    return { nodes, edges }
  }

  getDevice(id: string) {
    const nodes = this.graph.getNodes()
    for (let i = 0; i < nodes.length; i++) {
      const element = nodes[i].data as ITopologyDevice
      if (element.设备名称 === id) {
        return nodes[i]
      }
    }
  }

  updateDevice(id: string, data: ITopologyDevice) {
    const device = this.getDevice(id)
    if (!device) return
    device.data = data
    device.setAttrs({
      label: { text: data.设备名称 },
    })
    const edges = this.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const element = edges[i]
      const link = element.data as ILink
      if (link.src.device === id) link.src.device = data.设备名称
      if (link.dst.device === id) link.dst.device = data.设备名称
    }
  }

  addDevice(data: ITopologyDevice) {
    if (this.getDevice(data.设备名称)) return
    const device = this.editor.getDevice(data.设备型号)
    if (!device) {
      message.info(`该设备数据的设备型号在设备库中不存在: ${data.设备型号}`)
      return
    }
    const position = this.getDevicePosition(this.editor.devices, device.deviceType)
    const node = this.graph.createNode({
      shape: 'Device',
      ...position,
      label: data.设备名称,
      attrs: {
        img: { 'xlink:href': device.picturePath },
      },
      data,
    })
    this.graph.addNode(node)
    this.graph.centerCell(node)
    return node
  }

  getEdge(link: string) {
    const edges = this.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const element = edges[i].data as ILink
      if (element.link === link) return edges[i]
    }
  }

  updateEdge(id: string, data: ILink) {
    const line = this.getEdge(id)
    if (!line) return
    line.data = data
  }

  addEdge(link: ILink) {
    if (this.getEdge(link.link)) return
    const { src, dst } = link
    const source = this.getDevice(src.device)
    const target = this.getDevice(dst.device)
    if (!source || !target) return
    const device1 = this.editor.getDevice((source.data as ITopologyDevice).设备型号)
    const device2 = this.editor.getDevice((target.data as ITopologyDevice).设备型号)
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
        if (box) {
          return { x: (box.topLeft.x + box.topRight.x) * 0.5, y: box.topRight.y - 200 }
        }
        return { x: 0, y: -200 }
      }
      return { x: 0, y: -200 }
    }
    if (deviceType === 'server') {
      if (nodes.length) {
        const box = this.graph.getCellsBBox(nodes)
        if (box) {
          return { x: box.topRight.x + 200, y: (box.topRight.y + box.bottomRight.y) * 0.5 }
        }
        return { x: 200, y: 0 }
      }
      return { x: 200, y: 0 }
    }
    if (deviceType === 'host') {
      if (nodes.length) {
        const box = this.graph.getCellsBBox(nodes)
        if (box) {
          return { x: box.topLeft.x - 200, y: (box.topLeft.y + box.bottomLeft.y) * 0.5 }
        }
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

  isLinked(start: string, end: string) {
    const edges = this.graph.getEdges()
    for (let i = 0; i < edges.length; i++) {
      const { src, dst } = edges[i].data as ILink
      if ((src.device === start && dst.device === end) || (src.device === end && dst.device === start)) {
        return true
      }
    }
    return false
  }

  dispose() {
    this.graph.dispose()
  }
}
