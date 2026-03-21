/**
 * D3 画布组件
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as d3 from 'd3'
import type { D3Node, D3Link, CanvasSize } from '../types'
import type { DeviceLegend } from '@/model/topology'
import {
  resolveDeviceColor,
  resolveDeviceImage,
  resolveDeviceName,
  getDeviceLegendRegistry,
  NODE_CONFIG,
  LINK_CONFIG,
  CANVAS_CONFIG,
} from '../config'
import { CanvasLegendOverlay } from './CanvasLegendOverlay'
import {
  DEVICE_DRAG_FALLBACK_MIME_TYPE,
  DEVICE_DRAG_MIME_TYPE,
  getActiveDraggedDeviceType,
  hasDeviceDragType,
  subscribeCustomDeviceDrag,
} from '../dragDrop'
import {
  createForceSimulation,
  updateSimulationData,
  Simulation,
  createDragBehavior,
  createZoomBehavior,
  applyZoom,
  resetZoom,
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
  onDeviceDrop?: (deviceType: string, x: number, y: number) => void
  selectedNodeId?: string | null
  className?: string
  /** 传入时用于画布内图例；不传则使用当前全局注册表 */
  deviceLegends?: DeviceLegend[]
}

export interface D3CanvasHandle {
  fitToContent: () => void
  resetView: () => void
}

export const D3Canvas = forwardRef<D3CanvasHandle, D3CanvasProps>(({
  nodes: initialNodes,
  links: initialLinks,
  onNodeClick,
  onNodeContextMenu,
  onLinkClick,
  onBlankClick,
  onGraphChange,
  onDeviceDrop,
  selectedNodeId: _selectedNodeId,
  className = '',
  deviceLegends: deviceLegendsProp,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<Simulation | null>(null)
  const mainGroupRef = useRef<SVGGElement | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 800, height: 600 })
  const [draggingOver, setDraggingOver] = useState(false)
  const [dragDeviceType, setDragDeviceType] = useState<string | null>(null)

  const canvasLegendItems = useMemo(
    () =>
      deviceLegendsProp && deviceLegendsProp.length > 0 ? deviceLegendsProp : getDeviceLegendRegistry(),
    [deviceLegendsProp],
  )

  // 内部状态（用于响应式更新）
  const [nodes, setNodes] = useState<D3Node[]>(initialNodes)
  const [links, setLinks] = useState<D3Link[]>(initialLinks)

  const clearDragState = useCallback(() => {
    setDraggingOver(false)
    setDragDeviceType(null)
  }, [])

  const resolveDraggedDeviceType = useCallback((dataTransfer?: DataTransfer | null) => {
    if (!dataTransfer) {
      return getActiveDraggedDeviceType()
    }

    return (
      getActiveDraggedDeviceType() ||
      dataTransfer.getData(DEVICE_DRAG_MIME_TYPE) ||
      dataTransfer.getData(DEVICE_DRAG_FALLBACK_MIME_TYPE) ||
      null
    )
  }, [])

  const activateDropZone = useCallback(
    (dataTransfer?: DataTransfer | null) => {
      if (!onDeviceDrop) return false
      if (!hasDeviceDragType(dataTransfer?.types ?? []) && !getActiveDraggedDeviceType()) {
        return false
      }

      const deviceType = resolveDraggedDeviceType(dataTransfer)
      setDraggingOver(true)
      setDragDeviceType(deviceType)
      return true
    },
    [onDeviceDrop, resolveDraggedDeviceType]
  )

  const handleDeviceDropEvent = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!onDeviceDrop) return

      const deviceType = resolveDraggedDeviceType(event.dataTransfer)
      clearDragState()
      if (!deviceType) return

      event.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      const transform = d3.zoomTransform(svg)
      const [x, y] = transform.invert([pointerX, pointerY])
      onDeviceDrop(deviceType, x, y)
    },
    [clearDragState, onDeviceDrop, resolveDraggedDeviceType]
  )

  const fitViewportToContent = useCallback(() => {
    if (!svgRef.current || !mainGroupRef.current) {
      return
    }

    zoomToFit(svgRef.current, mainGroupRef.current, size.width, size.height)
  }, [size.height, size.width])

  const resetViewport = useCallback(() => {
    if (!svgRef.current || !mainGroupRef.current) {
      return
    }

    resetZoom(svgRef.current, mainGroupRef.current, size.width, size.height)
  }, [size.height, size.width])

  useImperativeHandle(
    ref,
    () => ({
      fitToContent: fitViewportToContent,
      resetView: resetViewport,
    }),
    [fitViewportToContent, resetViewport]
  )

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
    const preventPageScrollWhileHoveringCanvas = (event: WheelEvent) => {
      event.preventDefault()
    }

    container.addEventListener('wheel', preventPageScrollWhileHoveringCanvas, { passive: false })

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('wheel', preventPageScrollWhileHoveringCanvas)
    }
  }, [])

  useEffect(() => {
    return subscribeCustomDeviceDrag((state) => {
      const container = containerRef.current
      const svg = svgRef.current

      if (!container || !svg) {
        clearDragState()
        return
      }

      if (!state) {
        clearDragState()
        return
      }

      const rect = container.getBoundingClientRect()
      const isInside =
        state.clientX >= rect.left &&
        state.clientX <= rect.right &&
        state.clientY >= rect.top &&
        state.clientY <= rect.bottom

      if (state.phase === 'dragging') {
        if (isInside) {
          setDraggingOver(true)
          setDragDeviceType(state.deviceType)
        } else {
          clearDragState()
        }
        return
      }

      clearDragState()
      if (!isInside || !onDeviceDrop) {
        return
      }

      const svgRect = svg.getBoundingClientRect()
      const pointerX = state.clientX - svgRect.left
      const pointerY = state.clientY - svgRect.top
      const transform = d3.zoomTransform(svg)
      const [x, y] = transform.invert([pointerX, pointerY])
      onDeviceDrop(state.deviceType, x, y)
    })
  }, [clearDragState, onDeviceDrop])

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
    mainGroupRef.current = mainGroup.node() as SVGGElement

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
        .style('cursor', 'grab')
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

      // 节点图标（使用 SVG 资源）
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

      // 悬停效果
      nodeEnter
        .on('mouseenter', function () {
          d3.select(this)
            .select('.node-card')
            .attr('stroke-width', NODE_CONFIG.hoverStrokeWidth)
            .attr('stroke', '#94a3b8')
        })
        .on('mousedown', function () {
          d3.select(this).style('cursor', 'grabbing')
        })
        .on('mouseleave', function () {
          const nodeData = d3.select(this).datum() as D3Node
          d3.select(this)
            .style('cursor', 'grab')
            .select('.node-card')
            .attr('stroke-width', NODE_CONFIG.strokeWidth)
            .attr('stroke', resolveDeviceColor(nodeData.type))
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
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        outline: draggingOver ? '2px dashed #1677ff' : 'none',
        outlineOffset: draggingOver ? '-6px' : 0,
      }}
      onDragEnter={(event) => {
        if (!activateDropZone(event.dataTransfer)) return
        event.preventDefault()
      }}
      onDragOver={(event) => {
        if (!activateDropZone(event.dataTransfer)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return
        }
        clearDragState()
      }}
      onDrop={handleDeviceDropEvent}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <CanvasLegendOverlay legends={canvasLegendItems} />
      {!draggingOver && nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#475569',
              boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
              textAlign: 'center',
            }}
          >
            <strong style={{ display: 'block', marginBottom: 6, color: '#0f172a', fontSize: 14 }}>
              从图例拖入或使用 Add Device 开始构建
            </strong>
            <span style={{ fontSize: 12 }}>可在当前项目下维护多个拓扑示例，并持续编辑节点与链路</span>
          </div>
        </div>
      )}
      {draggingOver && dragDeviceType && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return
            }
            clearDragState()
          }}
          onDrop={handleDeviceDropEvent}
          style={{
            position: 'absolute',
            inset: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            borderRadius: 12,
            background:
              'linear-gradient(135deg, rgba(22, 119, 255, 0.18) 0%, rgba(114, 46, 209, 0.14) 100%)',
            boxShadow: 'inset 0 0 0 2px rgba(22, 119, 255, 0.6)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 14,
              background: 'rgba(15, 23, 42, 0.86)',
              border: '1px solid rgba(148, 163, 184, 0.24)',
              color: '#fff',
              boxShadow: '0 10px 32px rgba(2, 6, 23, 0.35)',
              pointerEvents: 'none',
            }}
          >
            <img
              src={resolveDeviceImage(dragDeviceType)}
              alt={dragDeviceType}
              style={{ width: 72, height: 34, objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <strong style={{ fontSize: 14 }}>
                放开即可创建
                {resolveDeviceName(dragDeviceType)}
              </strong>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>
                将在当前落点自动生成节点
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default D3Canvas
