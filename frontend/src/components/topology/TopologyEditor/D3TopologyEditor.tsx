/**
 * D3 拓扑编辑器组件
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { D3Editor, D3Canvas, D3Node, D3Link } from '../d3-engine'
import { D3SideBar } from './SideBar/D3SideBar'
import { D3ToolBar } from './ToolBar/D3ToolBar'
import { D3CreateLinkDialog } from './CreateLinkDialog/D3CreateLinkDialog'
import { D3EditDeviceDialog } from './EditDeviceDialog/D3EditDeviceDialog'
import { D3TopologyInfoPanel } from './TopologyInfoPanel/D3TopologyInfoPanel'
import styles from './index.module.less'

interface IProps {
  topologyId: string
  title: string
}

export const D3TopologyEditor: React.FC<IProps> = ({ topologyId, title }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<D3Editor | null>(null)
  const [, setUpdateCounter] = useState(0)

  // 初始化编辑器
  useEffect(() => {
    if (!containerRef.current) return
    const ed = new D3Editor(containerRef.current)
    setEditor(ed)
    return () => {
      ed.dispose()
      setEditor(null)
    }
  }, [])

  // 加载拓扑数据
  useEffect(() => {
    if (editor && topologyId) {
      editor.open(topologyId)
    }
  }, [editor, topologyId])

  // 监听图变化，触发重新渲染
  useEffect(() => {
    if (!editor) return
    const onGraphChanged = () => {
      setUpdateCounter((c) => c + 1)
    }
    editor.bus.on('GRAPH_CHANGED', onGraphChanged)
    return () => editor.bus.off('GRAPH_CHANGED', onGraphChanged)
  }, [editor])

  // 节点点击
  const handleNodeClick = useCallback(
    (node: D3Node, _x: number, _y: number) => {
      if (editor) {
        editor.selectNode(node.id)
      }
    },
    [editor]
  )

  // 节点右键菜单
  const handleNodeContextMenu = useCallback(
    (node: D3Node, x: number, y: number) => {
      if (editor) {
        editor.bus.emit('NODE_CONTEXTMENU', { node, x, y })
      }
    },
    [editor]
  )

  // 连线点击
  const handleLinkClick = useCallback(
    (link: D3Link, x: number, y: number) => {
      if (editor) {
        editor.bus.emit('LINK_CLICK', { link, x, y })
      }
    },
    [editor]
  )

  // 空白点击
  const handleBlankClick = useCallback(() => {
    if (editor) {
      editor.selectNode(null)
      editor.bus.emit('BLANK_CLICK', undefined)
    }
  }, [editor])

  // 图变化
  const handleGraphChange = useCallback(() => {
    if (editor) {
      editor.bus.emit('GRAPH_CHANGED', undefined)
    }
  }, [editor])

  if (!editor) {
    return <div className={styles.container}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles['side-bar']}>
        <D3SideBar editor={editor} />
      </div>
      <div ref={containerRef} className={styles.content}>
        <D3Canvas
          nodes={editor.nodes}
          links={editor.links}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onLinkClick={handleLinkClick}
          onBlankClick={handleBlankClick}
          onGraphChange={handleGraphChange}
          selectedNodeId={editor.selectedNodeId}
        />
      </div>
      <div className={styles['tool-bar']}>
        <D3ToolBar editor={editor} id={topologyId} />
      </div>
      <D3TopologyInfoPanel editor={editor} title={title} />
      <D3CreateLinkDialog editor={editor} />
      <D3EditDeviceDialog editor={editor} />
    </div>
  )
}

export default D3TopologyEditor
