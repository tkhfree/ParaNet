import styles from './index.module.less'

import React, { useEffect } from 'react'
import { Editor } from '../../topology-engine'
import { useDebounceFn } from 'ahooks'
import topologyStore from '@/stores/topology'
import { useShallow } from 'zustand/shallow'
import { updateFileContent } from '@/api/file'

interface IProps {
  editor: Editor
  id: string
}

export const ToolBar = (props: IProps) => {
  const { editor, id } = props
  // const [autoAaving, setAutoSaving] = useState(false)
  const [setTopology] = topologyStore(useShallow(state => [state.setTopology]))

  const { run } = useDebounceFn(
    async () => {
      if (!editor.autoSave) return

      const project = editor.serialize()

      await updateFileContent({ fileId: id, content: JSON.stringify(project, undefined, 2) })

      setTopology(id, 'topology')
    },
    { wait: 300 },
  )

  useEffect(() => {
    editor.bus.on('CELL_ADDED', run)
    editor.bus.on('CELL_CHANGED', run)
    editor.bus.on('CELL_REMOVED', run)
    return () => {
      editor.bus.off('CELL_ADDED', run)
      editor.bus.off('CELL_CHANGED', run)
      editor.bus.off('CELL_REMOVED', run)
    }
  }, [editor, run])

  // useEffect(() => {
  //   setAutoSaving(editor.autoSave)
  // }, [editor])

  // const onClickAutoSave = () => {
  //   editor.autoSave = !editor.autoSave

  //   setAutoSaving(editor.autoSave)
  // }

  const onClickUndo = () => editor.undo()

  const onClickRedo = () => editor.redo()

  return (
    <div className={styles.container}>
      {/* {autoAaving ? (
        <div className={styles.autoSaveActiveIcon} onClick={onClickAutoSave} />
      ) : (
        <div className={styles.autoSaveIcon} onClick={onClickAutoSave} />
      )} */}
      <div className={styles.undoIcon} onClick={onClickUndo} />
      <div className={styles.redoIcon} onClick={onClickRedo} />
    </div>
  )
}
