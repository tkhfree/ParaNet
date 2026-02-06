import React, { useEffect, useRef, useState } from 'react'
import { Previewer } from '../topology-engine'
import { DeviceInfoPopup } from './DeviceInfoPopup'
import { LinkInfoPopup } from './LinkInfoPopup'
import { ToolBar } from './ToolBar'
import styles from './index.module.less'

interface IProps {
  topologyId: string
  onPopup?: (id: string) => void
}

export const TopologyPreviewer: React.FC<IProps> = ({ topologyId, onPopup }) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [previewer, setPreviewer] = useState<Previewer | null>(null)

  useEffect(() => {
    if (!contentRef.current) return
    const p = new Previewer(contentRef.current)
    setPreviewer(p)
    return () => {
      p.dispose()
      setPreviewer(null)
    }
  }, [])

  useEffect(() => {
    if (previewer && topologyId) {
      previewer.open(topologyId)
    }
  }, [previewer, topologyId])

  return (
    <div className={styles.container} ref={containerRef}>
      <div ref={contentRef} className={styles.content} />
      {previewer && <DeviceInfoPopup previewer={previewer} />}
      {previewer && <LinkInfoPopup previewer={previewer} />}
      {previewer && onPopup && <ToolBar onPopup={() => onPopup(topologyId)} />}
    </div>
  )
}
