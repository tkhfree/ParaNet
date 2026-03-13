/**
 * D3 拓扑引擎专用类型定义
 */

import type { NodeType as NodeTypeBase } from '@/model/topology'

/** 重新导出 NodeType 以便其他模块使用 */
export type NodeType = NodeTypeBase

/** D3 力导向图节点 */
export interface D3Node {
  id: string
  name: string
  type: NodeType
  x: number
  y: number
  fx?: number | null
  fy?: number | null
  properties: Record<string, unknown>
  config?: Record<string, unknown>
}

/** D3 力导向图连线 */
export interface D3Link {
  id: string
  source: string | D3Node
  target: string | D3Node
  sourcePort?: string
  targetPort?: string
  bandwidth?: number
  delay?: number
  properties?: Record<string, unknown>
}

/** D3 图数据 */
export interface D3Graph {
  nodes: D3Node[]
  links: D3Link[]
}

/** 缩放状态 */
export interface ZoomState {
  k: number
  x: number
  y: number
}

/** 拖拽事件数据 */
export interface DragEventData {
  node: D3Node
  x: number
  y: number
}

/** D3 引擎事件类型 */
export interface D3EngineEvents {
  NODE_CLICK: { node: D3Node; x: number; y: number }
  NODE_CONTEXTMENU: { node: D3Node; x: number; y: number }
  NODE_DRAG_START: DragEventData
  NODE_DRAG: DragEventData
  NODE_DRAG_END: DragEventData
  LINK_CLICK: { link: D3Link; x: number; y: number }
  BLANK_CLICK: undefined
  GRAPH_CHANGED: undefined
  SELECTION_CHANGED: { nodeIds: string[] }
}

/** 画布尺寸 */
export interface CanvasSize {
  width: number
  height: number
}
