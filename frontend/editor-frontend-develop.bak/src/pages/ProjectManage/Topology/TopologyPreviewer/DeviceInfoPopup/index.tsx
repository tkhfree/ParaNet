import styles from './index.module.less'

import React, { useEffect, useState } from 'react'
import { Previewer } from '../../topology-engine'
import { INodeClickEvent } from '../../types'

interface IProps {
  previewer: Previewer
  isPopup?: boolean
}

export const DeviceInfoPopup = (props: IProps) => {
  const { previewer, isPopup } = props
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const onNodeClick = (event: INodeClickEvent) => {
      const { data, x, y } = event

      setPosition({ left: x, top: y })
      setVisible(true)
      const items = [
        { label: '设备名称', value: data.设备名称 },
        { label: '设备型号', value: data.设备型号 },
        { label: '设备形态', value: data.设备形态 },
        { label: '端口形态', value: data.端口形态 },
        { label: '交换容量', value: data.交换容量 },
        { label: '包转发率', value: data.包转发率 },
        { label: 'CPU系统', value: data.CPU系统 },
        { label: 'SSD', value: data.SSD },
      ]
      setData(items)
    }

    const onBlankClick = () => {
      setVisible(false)
    }

    previewer.bus.on('NODE_CLICK', onNodeClick)
    previewer.bus.on('EDGE_CLICK', onBlankClick)
    previewer.bus.on('BLANK_CLICK', onBlankClick)

    return () => {
      previewer.bus.off('NODE_CLICK', onNodeClick)
      previewer.bus.off('EDGE_CLICK', onBlankClick)
      previewer.bus.off('BLANK_CLICK', onBlankClick)
    }
  }, [previewer])

  return (
    <div
      className={styles.container}
      style={{
        display: visible ? 'block' : 'none',
        left: isPopup ? 525 : position.left,
        top: isPopup ? 48 : position.top,
      }}
    >
      {data.map(item => (
        <div key={item.label} className={styles.item}>
          <span className={styles.itemLabel}>{item.label}:</span>
          <span className={styles.itemValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
