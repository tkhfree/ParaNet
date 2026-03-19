import styles from './index.module.less'
import './index.less'

import React, { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import topologyStore from '@/stores/topology'
import { Editor } from '../topology-engine'
import { SideBar } from './SideBar'
import { ToolBar } from './ToolBar'
import { CreateLinkDialog } from './CreateLinkDialog'
import { TopologyInfoPanel } from './TopologyInfoPanel'
import { useVisible } from '@/hooks'
import { EditDeviceDialog } from './EditDeviceDialog'

interface IProps {
  projectId: string
  id: string
  title: string
}

export const TopologyEditor = (props: IProps) => {
  const { id, title, projectId } = props
  const container = useRef<HTMLDivElement>(null!)
  const [editor, setEditor] = useState<Editor>()
  const [topology] = topologyStore(useShallow(state => [state.topology]))
  const parentRef = useRef<HTMLDivElement>(null!)
  const visible = useVisible(parentRef)
  const [resize, setResize] = useState(false)

  useEffect(() => {
    const editor = new Editor(container.current as HTMLDivElement)

    setEditor(editor)
    return () => {
      editor.dispose()

      setEditor(undefined)
    }
  }, [])

  useEffect(() => {
    editor?.open(id)
  }, [editor, id])

  useEffect(() => {
    if (visible && resize) {
      setResize(false)
      setTimeout(() => {
        editor?.open(id)
      }, 100)
    }
  }, [id, editor, resize, visible])

  useEffect(() => {
    if (!editor) return

    if (id === topology.id && topology.type === 'json') {
      const open = async () => {
        editor.autoSave = false

        await editor.open(id)

        setTimeout(() => {
          editor.autoSave = true
        }, 500)
      }
      if (!visible) {
        setResize(true)
      } else {
        open()
      }
    }
  }, [id, topology, editor, visible])

  return (
    <div className={styles.container} ref={parentRef}>
      <div className={styles.sideBar}>{editor && <SideBar editor={editor} />}</div>
      <div ref={container} className={styles['content']} />
      <div className={styles.toolBar}>{editor && <ToolBar editor={editor} id={id} />}</div>
      {editor && <TopologyInfoPanel projectId={projectId} editor={editor} title={title} />}
      {editor && <CreateLinkDialog editor={editor} />}
      {editor && <EditDeviceDialog editor={editor} />}
    </div>
  )
}
