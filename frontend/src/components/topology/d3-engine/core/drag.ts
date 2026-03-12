/**
 * D3 拖拽交互
 */

import * as d3 from 'd3'
import type { Simulation } from './forceSimulation'
import type { D3Node } from '../types'

/**
 * 创建拖拽行为
 */
export function createDragBehavior(
  simulation: Simulation,
  callbacks?: {
    onDragStart?: (node: D3Node) => void
    onDrag?: (node: D3Node, x: number, y: number) => void
    onDragEnd?: (node: D3Node, x: number, y: number) => void
  }
) {
  function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    if (!event.active) {
      simulation.alphaTarget(0.08).restart()
    }
    node.fx = node.x
    node.fy = node.y
    callbacks?.onDragStart?.(node)
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    node.fx = event.x
    node.fy = event.y
    callbacks?.onDrag?.(node, event.x, event.y)
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    if (!event.active) {
      simulation.alphaTarget(0)
    }
    // 保持节点固定位置（不释放）
    node.fx = event.x
    node.fy = event.y
    callbacks?.onDragEnd?.(node, event.x, event.y)
  }

  return d3
    .drag<SVGGElement, D3Node, D3Node>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

/**
 * 创建固定位置拖拽（不使用力导向）
 */
export function createFreeDragBehavior(
  _nodes: D3Node[],
  callbacks?: {
    onDragStart?: (node: D3Node) => void
    onDrag?: (node: D3Node, x: number, y: number) => void
    onDragEnd?: (node: D3Node, x: number, y: number) => void
  }
) {
  function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    callbacks?.onDragStart?.(node)
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    node.x = event.x
    node.y = event.y
    node.fx = event.x
    node.fy = event.y
    callbacks?.onDrag?.(node, event.x, event.y)
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
    const node = event.subject
    event.sourceEvent?.stopPropagation()
    callbacks?.onDragEnd?.(node, event.x, event.y)
  }

  return d3
    .drag<SVGGElement, D3Node, D3Node>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}
