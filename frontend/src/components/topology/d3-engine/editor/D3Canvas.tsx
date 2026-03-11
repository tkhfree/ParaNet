/**
 * D3 画布组件
 */

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { D3Node, D3Link, CanvasSize } from '../types'
import { DEVICE_COLORS, NODE_CONFIG, LINK_CONFIG, CANVAS_CONFIG } from '../config'
import {
  createForceSimulation,
  updateSimulationData,
  Simulation,
  createDragBehavior,
  createZoomBehavior,
  applyZoom,
  zoomToFit,
} from '../core'

interface D3CanvasProps {
  nodes: D3Node[]
  links: D3Link[]
  onNodeClick?: (node: D3Node, x: number, y: number) => void
  onNodeContextMenu?: (node: D3Node, x: number, y: number) => void
  onLinkClick?: (link: D3Link, x: number, y: number) => void
  onBlankClick?: () => void
  onGraphChange?: () => void
  selectedNodeId?: string | null
  className?: string
}

export const D3Canvas: React.FC<D3CanvasProps> = ({
  nodes: initialNodes,
  links: initialLinks,
  onNodeClick,
  onNodeContextMenu,
  onLinkClick,
  onBlankClick,
  onGraphChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<Simulation | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 800, height: 600 })

  // 内部状态（用于响应式更新）
  const [nodes, setNodes] = useState<D3Node[]>(initialNodes)
  const [links, setLinks] = useState<D3Link[]>(initialLinks)

  // 同步外部传入的数据
  useEffect(() => {
    setNodes(initialNodes)
    setLinks(initialLinks)
  }, [initialNodes, initialLinks])

  // 监听容器尺寸变化
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

  // 初始化 D3 渲染
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    // 清除旧内容
    d3.select(svg).selectAll('*').remove()

    // 创建 SVG 结构
    const svgSelection = d3.select(svg)
      .attr('width', size.width)
      .attr('height', size.height)
      .style('background', CANVAS_CONFIG.backgroundColor)

    // 添加网格背景
    const defs = svgSelection.append('defs')

    // 网格 pattern
    defs
      .append('pattern')
      .attr('id', 'grid')
      .attr('width', CANVAS_CONFIG.gridSize)
      .attr('height', CANVAS_CONFIG.gridSize)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path')
      .attr('d', `M ${CANVAS_CONFIG.gridSize} 0 L 0 0 0 ${CANVAS_CONFIG.gridSize}`)
      .attr('fill', 'none')
      .attr('stroke', CANVAS_CONFIG.gridColor)
      .attr('stroke-width', 0.5)

    // 主容器（用于缩放和平移）
    const mainGroup = svgSelection.append('g').attr('class', 'main-group')

    // 网格背景层
    mainGroup
      .append('rect')
      .attr('class', 'grid-background')
      .attr('width', size.width * 4)
      .attr('height', size.height * 4)
      .attr('x', -size.width * 2)
      .attr('y', -size.height * 2)
      .attr('fill', 'url(#grid)')

    // 连线层（先渲染，在节点下方）
    const linksGroup = mainGroup.append('g').attr('class', 'links')

    // 节点层
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes')

    // 创建力导向模拟
    const simulation = createForceSimulation(size.width, size.height)
    simulationRef.current = simulation

    // 创建缩放行为
    const zoom = createZoomBehavior(svg, {
      onZoom: (transform) => {
        applyZoom(svg, mainGroup.node() as SVGGElement, transform)
      },
    })

    svgSelection.call(zoom)

    // 创建拖拽行为
    const drag = createDragBehavior(simulation, {
      onDragEnd: () => {
        onGraphChange?.()
      },
    })

    // 点击空白区域
    svgSelection.on('click', (event: MouseEvent) => {
      const target = event.target as SVGElement
      if (target.tagName === 'svg' || target.classList.contains('grid-background')) {
        onBlankClick?.()
      }
    })

    // 渲染函数
    const render = () => {
      // 更新连线
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
        .on('click', (event: MouseEvent, d: D3Link) => {
          event.stopPropagation()
          const [x, y] = d3.pointer(event, svg)
          onLinkClick?.(d, x, y)
        })

      linkEnter.append('title').text((d: D3Link) => {
        const src = typeof d.source === 'string' ? d.source : d.source.name
        const tgt = typeof d.target === 'string' ? d.target : d.target.name
        return `${src} - ${tgt}`
      })

      // 更新节点
      const nodeSelection = nodesGroup
        .selectAll<SVGGElement, D3Node>('.node')
        .data(nodes, (d: D3Node) => d.id)

      nodeSelection.exit().remove()

      const nodeEnter = nodeSelection
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('data-id', (d: D3Node) => d.id)
        .call(drag)
        .on('click', (event: MouseEvent, d: D3Node) => {
          event.stopPropagation()
          const [x, y] = d3.pointer(event, svg)
          onNodeClick?.(d, x, y)
        })
        .on('contextmenu', (event: MouseEvent, d: D3Node) => {
          event.preventDefault()
          event.stopPropagation()
          const [x, y] = d3.pointer(event, svg)
          onNodeContextMenu?.(d, x, y)
        })

      // 节点圆形
      nodeEnter
        .append('circle')
        .attr('class', 'node-circle')
        .attr('r', NODE_CONFIG.radius)
        .attr('fill', (d: D3Node) => DEVICE_COLORS[d.type])
        .attr('stroke', '#fff')
        .attr('stroke-width', NODE_CONFIG.strokeWidth)

      // 节点图标（使用文字符号）
      nodeEnter
        .append('text')
        .attr('class', 'node-icon')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#fff')
        .attr('font-size', '20px')
        .attr('font-weight', 'bold')
        .text((d: D3Node) => {
          const icons: Record<string, string> = {
            switch: 'S',
            router: 'R',
            host: 'H',
            controller: 'C',
            server: 'S',
            p4_switch: 'P',
          }
          return icons[d.type] || 'N'
        })

      // 节点标签
      nodeEnter
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', NODE_CONFIG.labelOffset)
        .attr('fill', '#ffffffcc')
        .attr('font-size', NODE_CONFIG.fontSize)
        .text((d: D3Node) => d.name)

      // 悬停效果
      nodeEnter
        .on('mouseenter', function () {
          d3.select(this)
            .select('.node-circle')
            .attr('stroke-width', NODE_CONFIG.hoverStrokeWidth)
            .attr('stroke', '#94a3b8')
        })
        .on('mouseleave', function () {
          d3.select(this)
            .select('.node-circle')
            .attr('stroke-width', NODE_CONFIG.strokeWidth)
            .attr('stroke', '#fff')
        })

      // 合并 enter 和 update
      const allNodes = nodeEnter.merge(nodeSelection)
      const allLinks = linkEnter.merge(linkSelection)

      // 更新模拟数据
      updateSimulationData(simulation, nodes, links)

      // 模拟 tick 更新位置
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

      // 初始缩放适应
      setTimeout(() => {
        if (nodes.length > 0) {
          zoomToFit(svg, mainGroup.node() as SVGGElement, size.width, size.height)
        }
      }, 100)
    }

    render()

    return () => {
      simulation.stop()
    }
  }, [nodes, links, size, onNodeClick, onNodeContextMenu, onLinkClick, onBlankClick, onGraphChange])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} />
    </div>
  )
}

export default D3Canvas
