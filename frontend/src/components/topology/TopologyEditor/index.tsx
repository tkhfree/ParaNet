import React, { useEffect, useRef, useState } from 'react'
import { Editor } from '../topology-engine'
import { SideBar } from './SideBar'
import { ToolBar } from './ToolBar'
import { CreateLinkDialog } from './CreateLinkDialog'
import { EditDeviceDialog } from './EditDeviceDialog'
import { TopologyInfoPanel } from './TopologyInfoPanel'
import styles from './index.module.less'

interface IProps {
  topologyId: string
  title: string
}

export const TopologyEditor: React.FC<IProps> = ({ topologyId, title }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<Editor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ed = new Editor(containerRef.current)
    setEditor(ed)
    return () => {
      ed.dispose()
      setEditor(null)
    }
  }, [])

  useEffect(() => {
    if (editor && topologyId) {
      editor.open(topologyId)
    }
  }, [editor, topologyId])

  return (
    <div className={styles.container} ref={parentRef}>
      <div className={styles['side-bar']}>
        {editor && <SideBar editor={editor} />}
      </div>
      <div ref={containerRef} className={styles.content} />
      <div className={styles['tool-bar']}>
        {editor && <ToolBar editor={editor} id={topologyId} />}
      </div>
      {editor && (
        <TopologyInfoPanel editor={editor} title={title} />
      )}
      {editor && <CreateLinkDialog editor={editor} />}
      {editor && <EditDeviceDialog editor={editor} />}
    </div>
  )
}
