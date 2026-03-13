/**
 * D3 预览器画布组件（只读模式）
 */

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { D3Node, D3Link, CanvasSize } from '../types'
import { resolveDeviceColor, resolveDeviceImage, NODE_CONFIG, LINK_CONFIG, CANVAS_CONFIG } from '../config'
import { createForceSimulation, updateSimulationData, Simulation, createZoomBehavior, applyZoom, zoomToFit } from '../core'

interface D3PreviewerCanvasProps {
  nodes: D3Node[]
  links: D3Link[]
  onNodeClick?: (node: D3Node, x: number, y: number) => void
  onNodeMouseEnter?: (node: D3Node, x: number, y: number) => void
  onNodeMouseLeave?: () => void
  onLinkClick?: (link: D3Link, x: number, y: number) => void
  className?: string
}

export const D3PreviewerCanvas: React.FC<D3PreviewerCanvasProps> = ({
  nodes: initialNodes,
  links: initialLinks,
  onNodeClick,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onLinkClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<Simulation | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 800, height: 600 })
  const [nodes, setNodes] = useState<D3Node[]>(initialNodes)
  const [links, setLinks] = useState<D3Link[]>(initialLinks)

  // 同步外部数据
  useEffect(() => {
    setNodes(initialNodes)
    setLinks(initialLinks)
  }, [initialNodes, initialLinks])

  // 监听尺寸变化
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // D3 渲染
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    d3.select(svg).selectAll('*').remove()

    const svgSelection = d3.select(svg)
      .attr('width', size.width)
      .attr('height', size.height)
      .style('background', CANVAS_CONFIG.backgroundColor)
      .style('cursor', 'grab')

    // 定义渐变和阴影
    const defs = svgSelection.append('defs')

    // 网格 pattern
    defs
      .append('pattern')
      .attr('id', 'preview-grid')
      .attr('width', CANVAS_CONFIG.gridSize)
      .attr('height', CANVAS_CONFIG.gridSize)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path')
      .attr('d', `M ${CANVAS_CONFIG.gridSize} 0 L 0 0 0 ${CANVAS_CONFIG.gridSize}`)
      .attr('fill', 'none')
      .attr('stroke', CANVAS_CONFIG.gridColor)
      .attr('stroke-width', 0.5)

    // 节点发光效果
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // 主容器
    const mainGroup = svgSelection.append('g').attr('class', 'main-group')

    // 网格背景
    mainGroup
      .append('rect')
      .attr('class', 'grid-background')
      .attr('width', size.width * 4)
      .attr('height', size.height * 4)
      .attr('x', -size.width * 2)
      .attr('y', -size.height * 2)
      .attr('fill', 'url(#preview-grid)')

    const linksGroup = mainGroup.append('g').attr('class', 'links')
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes')

    // 力导向模拟
    const simulation = createForceSimulation(size.width, size.height)
    simulationRef.current = simulation

    // 缩放
    const zoom = createZoomBehavior(svg, {
      onZoom: (transform) => {
        applyZoom(svg, mainGroup.node() as SVGGElement, transform)
      },
    })

    svgSelection.call(zoom)

    // 渲染
    const render = () => {
      // 连线
      const linkSelection = linksGroup
        .selectAll<SVGLineElement, D3Link>('.link')
        .data(links, (d: D3Link) => d.id)

      linkSelection.exit().remove()

      const linkEnter = linkSelection
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke', LINK_CONFIG.stroke)
        .attr('stroke-width', LINK_CONFIG.strokeWidth)
        .attr('stroke-linecap', 'round')
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: D3Link) => {
          event.stopPropagation()
          const [x, y] = d3.pointer(event, svg)
          onLinkClick?.(d, x, y)
        })
        .on('mouseenter', function () {
          d3.select(this).attr('stroke', LINK_CONFIG.hoverStroke).attr('stroke-width', 3)
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke', LINK_CONFIG.stroke).attr('stroke-width', LINK_CONFIG.strokeWidth)
        })

      // 节点
      const nodeSelection = nodesGroup
        .selectAll<SVGGElement, D3Node>('.node')
        .data(nodes, (d: D3Node) => d.id)

      nodeSelection.exit().remove()

      const nodeEnter = nodeSelection
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('data-id', (d: D3Node) => d.id)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: D3Node) => {
          event.stopPropagation()
          const [x, y] = d3.pointer(event, svg)
          onNodeClick?.(d, x, y)
        })
        .on('mouseenter', (event: MouseEvent, d: D3Node) => {
          const [x, y] = d3.pointer(event, svg)
          onNodeMouseEnter?.(d, x, y)
          d3.select(event.currentTarget as Element)
            .select('.node-card')
            .attr('stroke-width', NODE_CONFIG.hoverStrokeWidth)
            .attr('filter', 'url(#glow)')
        })
        .on('mouseleave', (event: MouseEvent) => {
          onNodeMouseLeave?.()
          d3.select(event.currentTarget as Element)
            .select('.node-card')
            .attr('stroke-width', NODE_CONFIG.strokeWidth)
            .attr('filter', null)
        })

      // 节点底板
      nodeEnter
        .append('rect')
        .attr('class', 'node-card')
        .attr('x', -NODE_CONFIG.width / 2)
        .attr('y', -NODE_CONFIG.height / 2)
        .attr('width', NODE_CONFIG.width)
        .attr('height', NODE_CONFIG.height)
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', '#1f2937')
        .attr('stroke', (d: D3Node) => resolveDeviceColor(d.type))
        .attr('stroke-width', NODE_CONFIG.strokeWidth)

      nodeEnter
        .append('rect')
        .attr('class', 'node-icon-bg')
        .attr('x', -NODE_CONFIG.width / 2 + 8)
        .attr('y', -NODE_CONFIG.height / 2 + 8)
        .attr('width', NODE_CONFIG.width - 16)
        .attr('height', NODE_CONFIG.imageHeight + 8)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', (d: D3Node) => `${resolveDeviceColor(d.type)}22`)

      // 节点图标
      nodeEnter
        .append('image')
        .attr('class', 'node-icon')
        .attr('x', -NODE_CONFIG.imageWidth / 2)
        .attr('y', -NODE_CONFIG.height / 2 + 10)
        .attr('width', NODE_CONFIG.imageWidth)
        .attr('height', NODE_CONFIG.imageHeight)
        .attr('href', (d: D3Node) => resolveDeviceImage(d.type))
        .attr('xlink:href', (d: D3Node) => resolveDeviceImage(d.type))
        .attr('preserveAspectRatio', 'xMidYMid meet')

      // 节点标签
      nodeEnter
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', NODE_CONFIG.labelOffset)
        .attr('fill', '#ffffff')
        .attr('font-size', NODE_CONFIG.fontSize)
        .attr('font-weight', 500)
        .text((d: D3Node) => d.name)

      const allNodes = nodeEnter.merge(nodeSelection)
      const allLinks = linkEnter.merge(linkSelection)

      updateSimulationData(simulation, nodes, links)

      simulation.on('tick', () => {
        allLinks
          .attr('x1', (d: D3Link) => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
            return source?.x ?? 0
          })
          .attr('y1', (d: D3Link) => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
            return source?.y ?? 0
          })
          .attr('x2', (d: D3Link) => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target)
            return target?.x ?? 0
          })
          .attr('y2', (d: D3Link) => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target)
            return target?.y ?? 0
          })

        allNodes.attr('transform', (d: D3Node) => `translate(${d.x}, ${d.y})`)
      })

      setTimeout(() => {
        if (nodes.length > 0) {
          zoomToFit(svg, mainGroup.node() as SVGGElement, size.width, size.height, 80)
        }
      }, 100)
    }

    render()

    return () => {
      simulation.stop()
    }
  }, [nodes, links, size, onNodeClick, onNodeMouseEnter, onNodeMouseLeave, onLinkClick])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} />
    </div>
  )
}

export default D3PreviewerCanvas
