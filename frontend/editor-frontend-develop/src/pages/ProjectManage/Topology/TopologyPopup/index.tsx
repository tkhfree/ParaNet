import './index.less'
import styles from './index.module.less'

import React, { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import { useShallow } from 'zustand/shallow'
import topologyStore from '@/stores/topology'
import { Previewer } from '../topology-engine'
import { DeviceInfoPopup } from '../TopologyPreviewer/DeviceInfoPopup'
import { LinkInfoPopup } from '../TopologyPreviewer/LinkInfoPopup'

interface IProps {
  id: string
  title: string
  visible: boolean
  setVisible: (visible: boolean) => void
}

export const TopologyPopup = (props: IProps) => {
  const { visible, setVisible, id, title } = props
  const [disabled, setDisabled] = useState(true)
  const [bounds, setBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  const draggleRef = useRef<HTMLDivElement>(null!)

  const container = useRef<HTMLDivElement>(null)
  const [previewer, setPreviewer] = useState<Previewer>()
  const [topology] = topologyStore(useShallow(state => [state.topology]))

  useEffect(() => {
    const previewer = new Previewer(container.current as HTMLDivElement, true)

    setPreviewer(previewer)
    return () => {
      previewer.dispose()

      setPreviewer(undefined)
    }
  }, [])

  useEffect(() => {
    if (id === topology.id && topology.type) {
      previewer?.open(id)
    }
  }, [id, topology, previewer])

  const onStart = (_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const targetRect = draggleRef.current?.getBoundingClientRect()
    if (!targetRect) {
      return
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    })
  }

  const afterOpenChange = (open: boolean) => open && previewer?.open(id)

  return (
    <>
      <Modal
        title={
          <div
            style={{ width: '100%', cursor: 'move' }}
            onMouseOver={() => {
              if (disabled) setDisabled(false)
            }}
            onMouseOut={() => setDisabled(true)}
            onFocus={() => {}}
            onBlur={() => {}}
          >
            {title}
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        mask={false}
        maskClosable={false}
        forceRender
        wrapClassName="topology-popup"
        afterOpenChange={afterOpenChange}
        modalRender={modal => (
          <Draggable
            disabled={disabled}
            bounds={bounds}
            nodeRef={draggleRef}
            onStart={(event, uiData) => onStart(event, uiData)}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <div className={styles.container}>
          <div ref={container} className={styles['content']} />
          {previewer && <DeviceInfoPopup previewer={previewer} isPopup />}
          {previewer && <LinkInfoPopup previewer={previewer} isPopup />}
        </div>
      </Modal>
    </>
  )
}
