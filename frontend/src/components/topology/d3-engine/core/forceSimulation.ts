/**
 * D3 力导向模拟
 */

import * as d3 from 'd3'
import type { D3Node, D3Link } from '../types'
import { FORCE_CONFIG } from '../config'

export type Simulation = d3.Simulation<D3Node, D3Link>

/**
 * 创建力导向模拟实例
 */
export function createForceSimulation(
  width: number,
  height: number
): Simulation {
  return d3
    .forceSimulation<D3Node>()
    .force(
      'link',
      d3
        .forceLink<D3Node, D3Link>()
        .id((d) => d.id)
        .distance(FORCE_CONFIG.linkDistance)
    )
    .force('charge', d3.forceManyBody().strength(FORCE_CONFIG.chargeStrength))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(FORCE_CONFIG.collisionRadius))
    .alphaDecay(FORCE_CONFIG.alphaDecay)
    .velocityDecay(FORCE_CONFIG.velocityDecay)
}

/**
 * 更新模拟数据
 */
export function updateSimulationData(
  simulation: Simulation,
  nodes: D3Node[],
  links: D3Link[]
): void {
  simulation.nodes(nodes)
  simulation.force<d3.ForceLink<D3Node, D3Link>>('link')?.links(links)
  simulation.alpha(0.18).restart()
}

/**
 * 固定节点位置
 */
export function fixNodePosition(node: D3Node, x: number, y: number): void {
  node.fx = x
  node.fy = y
  node.x = x
  node.y = y
}

/**
 * 释放节点固定位置
 */
export function releaseNodePosition(node: D3Node): void {
  node.fx = null
  node.fy = null
}

/**
 * 释放所有节点
 */
export function releaseAllNodes(nodes: D3Node[]): void {
  nodes.forEach((node) => {
    node.fx = null
    node.fy = null
  })
}

/**
 * 固定所有节点当前位置
 */
export function fixAllNodes(nodes: D3Node[]): void {
  nodes.forEach((node) => {
    node.fx = node.x
    node.fy = node.y
  })
}

/**
 * 停止模拟
 */
export function stopSimulation(simulation: Simulation): void {
  simulation.stop()
}

/**
 * 重启模拟
 */
export function restartSimulation(simulation: Simulation): void {
  simulation.alpha(0.2).restart()
}

/**
 * 轻微重启模拟（用于添加节点后）
 */
export function warmRestart(simulation: Simulation): void {
  simulation.alpha(0.12).restart()
}

/**
 * 获取节点中心位置
 */
export function getNodesCenter(nodes: D3Node[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 }
  }
  const sumX = nodes.reduce((acc, n) => acc + n.x, 0)
  const sumY = nodes.reduce((acc, n) => acc + n.y, 0)
  return {
    x: sumX / nodes.length,
    y: sumY / nodes.length,
  }
}

/**
 * 计算节点的边界框
 */
export function getNodesBoundingBox(
  nodes: D3Node[]
): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) return null

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  nodes.forEach((n) => {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
