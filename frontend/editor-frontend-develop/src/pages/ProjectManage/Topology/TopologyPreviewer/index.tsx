import styles from './index.module.less'

import React, { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import topologyStore from '@/stores/topology'
import { Previewer } from '../topology-engine'
import { DeviceInfoPopup } from './DeviceInfoPopup'
import { LinkInfoPopup } from './LinkInfoPopup'
import { ToolBar } from './ToolBar'
import { useVisible } from '@/hooks'

interface IProps {
  id: string
  onPopup: (id: string) => void
}

export const TopologyPreviewer = (props: IProps) => {
  const { id, onPopup } = props
  const container = useRef<HTMLDivElement>(null!)
  const content = useRef<HTMLDivElement>(null)
  const [previewer, setPreviewer] = useState<Previewer>()
  const [topology] = topologyStore(useShallow(state => [state.topology]))
  const visible = useVisible(container)
  const [resize, setResize] = useState(false)

  useEffect(() => {
    const previewer = new Previewer(content.current as HTMLDivElement)

    setPreviewer(previewer)
    return () => {
      previewer.dispose()

      setPreviewer(undefined)
    }
  }, [])

  useEffect(() => {
    previewer?.open(id)
  }, [id, previewer])

  useEffect(() => {
    if (visible && resize) {
      setResize(false)

      setTimeout(() => {
        previewer?.open(id)
      }, 100)
    }
  }, [id, previewer, resize, visible])

  useEffect(() => {
    if (id === topology.id && topology.type) {
      if (!visible) {
        setResize(true)
        return
      }
      previewer?.open(id)
    }
  }, [id, topology, previewer, visible])

  return (
    <div className={styles.container} ref={container}>
      <div ref={content} className={styles['content']} />
      {previewer && <DeviceInfoPopup previewer={previewer} />}
      {previewer && <LinkInfoPopup previewer={previewer} />}
      {previewer && <ToolBar onPopup={() => onPopup(id)} />}
    </div>
  )
}
