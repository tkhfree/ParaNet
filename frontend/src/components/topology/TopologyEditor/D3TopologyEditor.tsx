/**
 * D3 拓扑编辑器组件
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { App } from 'antd'
import { useShallow } from 'zustand/shallow'
import { CreateDeviceDialog } from './CreateDeviceDialog'
import { D3Editor, D3Canvas, type D3CanvasHandle, D3Node, D3Link } from '../d3-engine'
import { resolveDeviceName } from '../d3-engine'
import { D3CreateLinkDialog } from './CreateLinkDialog/D3CreateLinkDialog'
import { D3EditDeviceDialog } from './EditDeviceDialog/D3EditDeviceDialog'
import styles from './index.module.less'
import { topologyApi } from '@/api/topology'
import topologyStore from '@/stores/topology'
import type { IDevice } from '@/model/topology'

const SAVE_DEBOUNCE_MS = 300

export interface D3TopologyEditorStats {
  topologyTitle: string
  nodeCount: number
  linkCount: number
  deviceCounts: Partial<Record<D3Node['type'], number>>
}

export interface D3TopologyEditorHandle {
  fitToContent: () => void
  resetView: () => void
  openCreateDeviceDialog: (deviceType: string) => void
  startLinkMode: () => void
  flushSave: () => Promise<void>
}

interface IProps {
  topologyId: string
  title: string
  className?: string
  onGraphStatsChange?: (stats: D3TopologyEditorStats) => void
  onSelectionChange?: (node: D3Node | null) => void
}

function buildGraphStats(editor: D3Editor, title: string): D3TopologyEditorStats {
  const deviceCounts: Partial<Record<D3Node['type'], number>> = {}
  for (const node of editor.nodes) {
    deviceCounts[node.type] = (deviceCounts[node.type] ?? 0) + 1
  }

  return {
    topologyTitle: title,
    nodeCount: editor.nodes.length,
    linkCount: editor.links.length,
    deviceCounts,
  }
}

export const D3TopologyEditor = forwardRef<D3TopologyEditorHandle, IProps>(({
  topologyId,
  title,
  className,
  onGraphStatsChange,
  onSelectionChange,
}, ref) => {
  const { message } = App.useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<D3CanvasHandle | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveNowRef = useRef<(() => Promise<void>) | null>(null)
  const setTopology = topologyStore(useShallow((s) => s.setTopology))
  const [editor, setEditor] = useState<D3Editor | null>(null)
  const [, setUpdateCounter] = useState(0)
  const [createVisible, setCreateVisible] = useState(false)
  const [pendingDeviceType, setPendingDeviceType] = useState('')
  const [loadingTopology, setLoadingTopology] = useState(false)
  const [topologyLoadFailed, setTopologyLoadFailed] = useState(false)

  const openCreateDialog = useCallback((deviceType: string) => {
    setPendingDeviceType(deviceType)
    setCreateVisible(true)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      fitToContent: () => {
        canvasRef.current?.fitToContent()
      },
      resetView: () => {
        canvasRef.current?.resetView()
      },
      openCreateDeviceDialog: (deviceType: string) => {
        openCreateDialog(deviceType)
      },
      startLinkMode: () => {
        if (!editor || editor.nodes.length < 2) {
          message.warning('至少需要两个设备后才能创建链路')
          return
        }
        editor.bus.emit('LINK_CREATE_REQUESTED', undefined)
      },
      flushSave: async () => {
        await saveNowRef.current?.()
      },
    }),
    [editor, message, openCreateDialog]
  )

  useEffect(() => {
    if (!containerRef.current) return
    const ed = new D3Editor(containerRef.current)
    setEditor(ed)
    return () => {
      ed.dispose()
      setEditor(null)
    }
  }, [])

  useEffect(() => {
    if (editor && topologyId) {
      setLoadingTopology(true)
      setTopologyLoadFailed(false)
      void editor
        .open(topologyId)
        .then(() => {
          setTopologyLoadFailed(false)
          setUpdateCounter((c) => c + 1)
          onGraphStatsChange?.(buildGraphStats(editor, title))
          requestAnimationFrame(() => {
            canvasRef.current?.fitToContent()
          })
        })
        .catch(() => {
          setTopologyLoadFailed(true)
          message.error('拓扑加载失败，请稍后重试')
        })
        .finally(() => {
          setLoadingTopology(false)
        })
      onSelectionChange?.(null)
    } else {
      setTopologyLoadFailed(false)
    }
  }, [editor, message, onGraphStatsChange, onSelectionChange, title, topologyId])

  useEffect(() => {
    if (!editor) return
    const onGraphChanged = () => {
      setUpdateCounter((c) => c + 1)
      onGraphStatsChange?.(buildGraphStats(editor, title))
    }
    editor.bus.on('GRAPH_CHANGED', onGraphChanged)
    onGraphChanged()
    return () => editor.bus.off('GRAPH_CHANGED', onGraphChanged)
  }, [editor, onGraphStatsChange, title])

  useEffect(() => {
    if (!editor) return

    const save = async () => {
      if (!editor.autoSave) return
      const { nodes, links } = editor.toApiPayload()
      await topologyApi.update(topologyId, { nodes, links })
      setTopology(topologyId, 'topology')
    }

    saveNowRef.current = save

    const scheduleSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void save()
      }, SAVE_DEBOUNCE_MS)
    }

    editor.bus.on('GRAPH_CHANGED', scheduleSave)
    return () => {
      editor.bus.off('GRAPH_CHANGED', scheduleSave)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveNowRef.current = null
    }
  }, [editor, setTopology, topologyId])

  const handleNodeClick = useCallback(
    (node: D3Node, _x: number, _y: number) => {
      if (!editor) {
        return
      }

      editor.selectNode(node.id)
      onSelectionChange?.(node)
    },
    [editor, onSelectionChange]
  )

  const handleNodeContextMenu = useCallback(
    (node: D3Node, x: number, y: number) => {
      if (editor) {
        editor.bus.emit('NODE_CONTEXTMENU', { node, x, y })
      }
    },
    [editor]
  )

  const handleLinkClick = useCallback(
    (link: D3Link, x: number, y: number) => {
      if (editor) {
        editor.bus.emit('LINK_CLICK', { link, x, y })
      }
    },
    [editor]
  )

  const handleBlankClick = useCallback(() => {
    if (!editor) {
      return
    }

    editor.selectNode(null)
    editor.bus.emit('BLANK_CLICK', undefined)
    onSelectionChange?.(null)
  }, [editor, onSelectionChange])

  const handleGraphChange = useCallback(() => {
    if (editor) {
      editor.bus.emit('GRAPH_CHANGED', undefined)
    }
  }, [editor])

  const handleCreateDevice = useCallback(
    (device: IDevice) => {
      if (!editor) {
        return
      }
      editor.addDevice(device)
      editor.bus.emit('GRAPH_CHANGED', undefined)
    },
    [editor]
  )

  const handleDeviceDrop = useCallback(
    (deviceType: string, x: number, y: number) => {
      if (!editor) {
        return
      }
      const deviceLabel = resolveDeviceName(deviceType)
      const existingCount = editor.nodes.filter((node) => node.type === deviceType).length
      const deviceName = `${deviceLabel}-${existingCount + 1}`
      const created = editor.addDevice(
        {
          deviceName,
          deviceClass: deviceType,
          deviceForm: '',
          portForm: '',
          capacity: '',
          rate: '',
          system: '',
          ssd: '',
        },
        { x, y }
      )
      if (!created) {
        message.warning(`${deviceName} 已存在，请重试`)
        return
      }
      editor.bus.emit('GRAPH_CHANGED', undefined)
      message.success(`已创建设备 ${deviceName}`)
    },
    [editor, message]
  )

  return (
    <div className={`${styles.container} ${className ?? ''}`.trim()}>
      <div ref={containerRef} className={styles.content}>
        {editor ? (
          <>
            <D3Canvas
              ref={canvasRef}
              nodes={editor.nodes}
              links={editor.links}
              onNodeClick={handleNodeClick}
              onNodeContextMenu={handleNodeContextMenu}
              onLinkClick={handleLinkClick}
              onBlankClick={handleBlankClick}
              onGraphChange={handleGraphChange}
              onDeviceDrop={handleDeviceDrop}
              selectedNodeId={editor.selectedNodeId}
            />
            {loadingTopology && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248, 250, 252, 0.72)',
                  color: '#64748b',
                  fontSize: 14,
                  zIndex: 5,
                }}
              >
                正在加载拓扑...
              </div>
            )}
            {!loadingTopology && topologyLoadFailed && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248, 250, 252, 0.72)',
                  color: '#64748b',
                  fontSize: 14,
                  zIndex: 5,
                }}
              >
                拓扑加载失败，请稍后重试
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: '#64748b',
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        )}
      </div>
      {editor && (
        <>
          <CreateDeviceDialog
            title="新建设备"
            deviceClass={pendingDeviceType}
            visible={createVisible}
            setVisible={(visible) => {
              setCreateVisible(visible)
            }}
            initialValues={{
              deviceClass: pendingDeviceType,
              deviceName: pendingDeviceType
                ? `${resolveDeviceName(pendingDeviceType)}-${editor.nodes.length + 1}`
                : '',
            }}
            onConfirm={handleCreateDevice}
          />
          <D3CreateLinkDialog editor={editor} />
          <D3EditDeviceDialog editor={editor} />
        </>
      )}
    </div>
  )
})

export default D3TopologyEditor
