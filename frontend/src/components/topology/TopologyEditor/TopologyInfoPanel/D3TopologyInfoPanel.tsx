/**
 * D3 版本拓扑信息面板
 */

import React, { useEffect, useState } from 'react'
import type { D3Editor } from '../../d3-engine'
import { DEVICE_NAMES } from '../../d3-engine'
import styles from './index.module.less'

interface IItem {
  label: string
  value: number
}

interface IProps {
  editor: D3Editor
  title: string
}

export const D3TopologyInfoPanel: React.FC<IProps> = ({ editor, title }) => {
  const [devices, setDevices] = useState<IItem[]>([])

  useEffect(() => {
    const refresh = () => {
      const nodes = editor.nodes
      const counts: Record<string, number> = {}
      for (const node of nodes) {
        const name = node.type
        counts[name] = (counts[name] ?? 0) + 1
      }
      setDevices(Object.entries(counts).map(([label, value]) => ({ label, value })))
    }
    editor.bus.on('GRAPH_CHANGED', refresh)
    refresh() // 初始加载
    return () => {
      editor.bus.off('GRAPH_CHANGED', refresh)
    }
  }, [editor])

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <span className={styles['item-label']}>名称:</span>
        <span className={styles['item-value']} title={title}>
          {title}
        </span>
      </div>
      {devices.map((item) => (
        <div className={styles.item} key={item.label}>
          <span className={styles['item-label']}>{DEVICE_NAMES[item.label as keyof typeof DEVICE_NAMES] ?? item.label}数量:</span>
          <span className={styles['item-value']}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
