/**
 * D3 拓扑预览器引擎（只读）
 */

import mitt, { type Emitter } from 'mitt'
import type { Topology } from '@/model/topology'
import { topologyApi } from '@/api/topology'
import type { D3Node, D3Link, D3Graph } from '../types'
import { topologyToD3 } from '../utils/converters'

/** D3 预览器事件 */
export type D3PreviewerEvents = {
  NODE_CLICK: { node: D3Node; x: number; y: number }
  NODE_MOUSEENTER: { node: D3Node; x: number; y: number }
  NODE_MOUSELEAVE: undefined
  LINK_CLICK: { link: D3Link; x: number; y: number }
}

export class D3Previewer {
  container: HTMLDivElement
  bus: Emitter<D3PreviewerEvents>

  private _graph: D3Graph

  constructor(container: HTMLDivElement) {
    this.container = container
    this.bus = mitt<D3PreviewerEvents>()
    this._graph = { nodes: [], links: [] }
  }

  get graph(): D3Graph {
    return this._graph
  }

  get nodes(): D3Node[] {
    return this._graph.nodes
  }

  get links(): D3Link[] {
    return this._graph.links
  }

  async open(id: string): Promise<void> {
    this.clear()
    const res = await topologyApi.getById(id)
    const t = res.data as Topology
    this._graph = topologyToD3(t)
  }

  setGraph(graph: D3Graph): void {
    this._graph = graph
  }

  clear(): void {
    this._graph = { nodes: [], links: [] }
  }

  getNodeById(id: string): D3Node | undefined {
    return this._graph.nodes.find((n) => n.id === id)
  }

  getLinkById(id: string): D3Link | undefined {
    return this._graph.links.find((l) => l.id === id)
  }

  dispose(): void {
    this._graph = { nodes: [], links: [] }
    this.bus.all.clear()
  }
}
