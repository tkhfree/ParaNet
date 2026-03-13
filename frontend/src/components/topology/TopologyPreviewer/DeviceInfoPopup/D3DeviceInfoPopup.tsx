/**
 * D3 版本设备信息弹窗
 */

import React, { useEffect, useState } from 'react'
import type { D3Previewer, D3Node } from '../../d3-engine'
import { resolveDeviceName } from '../../d3-engine'
import styles from './index.module.less'

interface IProps {
  previewer: D3Previewer
  isPopup?: boolean
}

export const D3DeviceInfoPopup: React.FC<IProps> = ({ previewer, isPopup }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const onNodeClick = (event: { node: D3Node; x: number; y: number }) => {
      const { node, x, y } = event
      const props = node.properties || {}
      setPosition({ left: x, top: y })
      setVisible(true)
      setData([
        { label: '设备名称', value: node.name },
        { label: '设备型号', value: resolveDeviceName(node.type) },
        { label: '设备形态', value: (props.deviceForm as string) || '-' },
        { label: '端口形态', value: (props.portForm as string) || '-' },
        { label: '交换容量', value: (props.capacity as string) || '-' },
        { label: '包转发率', value: (props.rate as string) || '-' },
        { label: 'CPU系统', value: (props.system as string) || '-' },
        { label: 'SSD', value: (props.ssd as string) || '-' },
      ])
    }
    const onBlank = () => setVisible(false)
    previewer.bus.on('NODE_CLICK', onNodeClick)
    previewer.bus.on('LINK_CLICK', onBlank)
    previewer.bus.on('NODE_MOUSELEAVE', onBlank)
    return () => {
      previewer.bus.off('NODE_CLICK', onNodeClick)
      previewer.bus.off('LINK_CLICK', onBlank)
      previewer.bus.off('NODE_MOUSELEAVE', onBlank)
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
