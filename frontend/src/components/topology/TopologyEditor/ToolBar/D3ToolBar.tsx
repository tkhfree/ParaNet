/**
 * D3 版本工具栏
 */

import React, { useEffect, useRef } from 'react'
import { UndoOutlined, RedoOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/shallow'
import { topologyApi } from '@/api/topology'
import topologyStore from '@/stores/topology'
import type { D3Editor } from '../../d3-engine'
import styles from './index.module.less'

const SAVE_DEBOUNCE_MS = 300

interface IProps {
  editor: D3Editor
  id: string
}

export const D3ToolBar: React.FC<IProps> = ({ editor, id }) => {
  const setTopology = topologyStore(useShallow((s) => s.setTopology))
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const save = () => {
    if (!editor.autoSave) return
    const { nodes, links } = editor.toApiPayload()
    topologyApi.update(id, { nodes, links }).then(() => {
      setTopology(id, 'topology')
    })
  }

  const run = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS)
  }

  useEffect(() => {
    editor.bus.on('GRAPH_CHANGED', run)
    return () => {
      editor.bus.off('GRAPH_CHANGED', run)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [editor])

  return (
    <div className={styles.container}>
      <span className={styles['undo-icon']} onClick={() => {}} title="撤销">
        <UndoOutlined />
      </span>
      <span className={styles['redo-icon']} onClick={() => {}} title="重做">
        <RedoOutlined />
      </span>
    </div>
  )
}
