/**
 * D3 拓扑预览器组件（只读）
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { D3Previewer, D3PreviewerCanvas, D3Node, D3Link } from '../d3-engine'
import { D3DeviceInfoPopup } from './DeviceInfoPopup/D3DeviceInfoPopup'
import { D3LinkInfoPopup } from './LinkInfoPopup/D3LinkInfoPopup'
import { ToolBar } from './ToolBar'
import styles from './index.module.less'

interface IProps {
  topologyId: string
  onPopup?: (id: string) => void
}

export const D3TopologyPreviewer: React.FC<IProps> = ({ topologyId, onPopup }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [previewer, setPreviewer] = useState<D3Previewer | null>(null)
  const [, setUpdateCounter] = useState(0)
  const [loadingTopology, setLoadingTopology] = useState(false)

  // 初始化预览器
  useEffect(() => {
    if (!containerRef.current) return
    const p = new D3Previewer(containerRef.current)
    setPreviewer(p)
    return () => {
      p.dispose()
      setPreviewer(null)
    }
  }, [])

  // 加载拓扑数据
  useEffect(() => {
    if (previewer && topologyId) {
      setLoadingTopology(true)
      void previewer
        .open(topologyId)
        .then(() => {
          setUpdateCounter((c) => c + 1)
        })
        .finally(() => {
          setLoadingTopology(false)
        })
    }
  }, [previewer, topologyId])

  // 节点点击
  const handleNodeClick = useCallback(
    (node: D3Node, x: number, y: number) => {
      if (previewer) {
        previewer.bus.emit('NODE_CLICK', { node, x, y })
      }
    },
    [previewer]
  )

  // 节点鼠标进入
  const handleNodeMouseEnter = useCallback(
    (node: D3Node, x: number, y: number) => {
      if (previewer) {
        previewer.bus.emit('NODE_MOUSEENTER', { node, x, y })
      }
    },
    [previewer]
  )

  // 节点鼠标离开
  const handleNodeMouseLeave = useCallback(() => {
    if (previewer) {
      previewer.bus.emit('NODE_MOUSELEAVE', undefined)
    }
  }, [previewer])

  // 连线点击
  const handleLinkClick = useCallback(
    (link: D3Link, x: number, y: number) => {
      if (previewer) {
        previewer.bus.emit('LINK_CLICK', { link, x, y })
      }
    },
    [previewer]
  )

  return (
    <div className={styles.container}>
      <div className={styles.content} ref={containerRef}>
        {previewer ? (
          <D3PreviewerCanvas
            nodes={previewer.nodes}
            links={previewer.links}
            onNodeClick={handleNodeClick}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onLinkClick={handleLinkClick}
          />
        ) : (
          <div className={styles.loadingState}>Loading...</div>
        )}
        {loadingTopology && <div className={styles.loadingOverlay}>正在加载拓扑...</div>}
      </div>
      {previewer && (
        <>
          <D3DeviceInfoPopup previewer={previewer} />
          <D3LinkInfoPopup previewer={previewer} />
        </>
      )}
      {onPopup && <ToolBar onPopup={() => onPopup(topologyId)} />}
    </div>
  )
}

export default D3TopologyPreviewer
