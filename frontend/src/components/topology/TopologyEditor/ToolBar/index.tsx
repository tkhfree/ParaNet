import React, { useEffect, useRef } from 'react'
import { UndoOutlined, RedoOutlined } from '@ant-design/icons'
import { useShallow } from 'zustand/shallow'
import { topologyApi } from '@/api/topology'
import topologyStore from '@/stores/topology'
import type { Editor } from '../../topology-engine'
import styles from './index.module.less'

const SAVE_DEBOUNCE_MS = 300

interface IProps {
  editor: Editor
  id: string
}

export const ToolBar: React.FC<IProps> = ({ editor, id }) => {
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
    editor.bus.on('CELL_ADDED', run)
    editor.bus.on('CELL_CHANGED', run)
    editor.bus.on('CELL_REMOVED', run)
    return () => {
      editor.bus.off('CELL_ADDED', run)
      editor.bus.off('CELL_CHANGED', run)
      editor.bus.off('CELL_REMOVED', run)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [editor])

  return (
    <div className={styles.container}>
      <span className={styles['undo-icon']} onClick={() => editor.undo()} title="撤销">
        <UndoOutlined />
      </span>
      <span className={styles['redo-icon']} onClick={() => editor.redo()} title="重做">
        <RedoOutlined />
      </span>
    </div>
  )
}
