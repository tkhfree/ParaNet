/**
 * D3 缩放和平移
 */

import * as d3 from 'd3'
import type { ZoomState } from '../types'
import { CANVAS_CONFIG, ANIMATION_CONFIG } from '../config'

export type ZoomBehavior = d3.ZoomBehavior<SVGSVGElement, unknown>

/**
 * 创建缩放行为
 */
export function createZoomBehavior(
  _svg: SVGSVGElement,
  callbacks?: {
    onZoom?: (transform: d3.ZoomTransform) => void
    onZoomEnd?: (transform: d3.ZoomTransform) => void
  }
): ZoomBehavior {
  return d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([CANVAS_CONFIG.minZoom, CANVAS_CONFIG.maxZoom])
    .filter((event) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return true
      }

      // 鼠标滚轮始终允许缩放；节点本身不触发画布平移，优先交给节点拖拽。
      if (event.type === 'wheel') {
        return true
      }

      return !target.closest('.node')
    })
    .on('zoom', (event) => {
      callbacks?.onZoom?.(event.transform)
    })
    .on('end', (event) => {
      callbacks?.onZoomEnd?.(event.transform)
    })
}

/**
 * 应用缩放到容器
 */
export function applyZoom(
  _svg: SVGSVGElement,
  container: SVGGElement,
  transform: d3.ZoomTransform
): void {
  d3.select(container).attr('transform', transform.toString())
}

/**
 * 缩放到适应内容
 */
export function zoomToFit(
  svg: SVGSVGElement,
  container: SVGGElement,
  width: number,
  height: number,
  padding = 50
): void {
  const bounds = (container as SVGGElement).getBBox()
  if (!bounds.width || !bounds.height) return

  const fullWidth = bounds.width + padding * 2
  const fullHeight = bounds.height + padding * 2
  const scale = Math.min(width / fullWidth, height / fullHeight, 1)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-centerX, -centerY)

  d3.select(svg)
    .transition()
    .duration(ANIMATION_CONFIG.zoomDuration)
    .call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform
    )

  d3.select(container).attr('transform', transform.toString())
}

/**
 * 重置缩放
 */
export function resetZoom(
  svg: SVGSVGElement,
  container: SVGGElement,
  width: number,
  height: number
): void {
  const transform = d3.zoomIdentity.translate(width / 2, height / 2)

  d3.select(svg)
    .transition()
    .duration(ANIMATION_CONFIG.zoomDuration)
    .call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform
    )

  d3.select(container).attr('transform', transform.toString())
}

/**
 * 缩放到指定比例
 */
export function zoomTo(
  svg: SVGSVGElement,
  scale: number,
  centerX?: number,
  centerY?: number
): void {
  const currentTransform = d3.zoomTransform(svg)
  const x = centerX ?? currentTransform.x
  const y = centerY ?? currentTransform.y

  const transform = d3.zoomIdentity.translate(x, y).scale(scale)

  d3.select(svg)
    .transition()
    .duration(ANIMATION_CONFIG.zoomDuration)
    .call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform
    )
}

/**
 * 放大
 */
export function zoomIn(svg: SVGSVGElement, step = 0.2): void {
  const currentTransform = d3.zoomTransform(svg)
  const newScale = Math.min(currentTransform.k + step, CANVAS_CONFIG.maxZoom)

  zoomTo(svg, newScale, currentTransform.x, currentTransform.y)
}

/**
 * 缩小
 */
export function zoomOut(svg: SVGSVGElement, step = 0.2): void {
  const currentTransform = d3.zoomTransform(svg)
  const newScale = Math.max(currentTransform.k - step, CANVAS_CONFIG.minZoom)

  zoomTo(svg, newScale, currentTransform.x, currentTransform.y)
}

/**
 * 获取当前缩放状态
 */
export function getZoomState(svg: SVGSVGElement): ZoomState {
  const transform = d3.zoomTransform(svg)
  return {
    k: transform.k,
    x: transform.x,
    y: transform.y,
  }
}

/**
 * 居中显示指定节点
 */
export function centerOnNode(
  svg: SVGSVGElement,
  nodeX: number,
  nodeY: number,
  width: number,
  height: number
): void {
  const currentTransform = d3.zoomTransform(svg)
  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(currentTransform.k)
    .translate(-nodeX, -nodeY)

  d3.select(svg)
    .transition()
    .duration(ANIMATION_CONFIG.zoomDuration)
    .call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      transform
    )
}
