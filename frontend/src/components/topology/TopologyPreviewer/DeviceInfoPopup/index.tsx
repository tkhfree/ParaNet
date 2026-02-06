import React, { useEffect, useState } from 'react'
import type { INodeClickEvent } from '@/model/topology'
import type { Previewer } from '../../topology-engine'
import styles from './index.module.less'

interface IProps {
  previewer: Previewer
  isPopup?: boolean
}

export const DeviceInfoPopup: React.FC<IProps> = ({ previewer, isPopup }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const onNodeClick = (event: INodeClickEvent) => {
      const { data: d, x, y } = event
      setPosition({ left: x, top: y })
      setVisible(true)
      setData([
        { label: '设备名称', value: d.设备名称 },
        { label: '设备型号', value: d.设备型号 },
        { label: '设备形态', value: d.设备形态 },
        { label: '端口形态', value: d.端口形态 },
        { label: '交换容量', value: d.交换容量 },
        { label: '包转发率', value: d.包转发率 },
        { label: 'CPU系统', value: d.CPU系统 },
        { label: 'SSD', value: d.SSD },
      ])
    }
    const onBlank = () => setVisible(false)
    previewer.bus.on('NODE_CLICK', onNodeClick)
    previewer.bus.on('EDGE_CLICK', onBlank)
    previewer.bus.on('BLANK_CLICK', onBlank)
    return () => {
      previewer.bus.off('NODE_CLICK', onNodeClick)
      previewer.bus.off('EDGE_CLICK', onBlank)
      previewer.bus.off('BLANK_CLICK', onBlank)
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
      {data.map((item) => (
        <div key={item.label} className={styles.item}>
          <span className={styles['item-label']}>{item.label}:</span>
          <span className={styles['item-value']}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
