import React, { useEffect, useState } from 'react'
import type { ITopologyDevice } from '@/model/topology'
import type { Editor } from '../../topology-engine'
import styles from './index.module.less'

interface IItem {
  label: string
  value: number
}

interface IProps {
  editor: Editor
  title: string
}

export const TopologyInfoPanel: React.FC<IProps> = ({ editor, title }) => {
  const [devices, setDevices] = useState<IItem[]>([])

  useEffect(() => {
    const refresh = () => {
      const nodes = editor.graphManager.graph.getNodes()
      const counts: Record<string, number> = {}
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i].data as ITopologyDevice
        const name = d.设备型号
        counts[name] = (counts[name] ?? 0) + 1
      }
      setDevices(Object.entries(counts).map(([label, value]) => ({ label, value })))
    }
    editor.bus.on('GRAPH_DESERIALIZE', refresh)
    editor.bus.on('CELL_ADDED', refresh)
    editor.bus.on('CELL_REMOVED', refresh)
    return () => {
      editor.bus.off('GRAPH_DESERIALIZE', refresh)
      editor.bus.off('CELL_ADDED', refresh)
      editor.bus.off('CELL_REMOVED', refresh)
    }
  }, [editor])

  const typeLabels: Record<string, string> = {
    switch: '交换机',
    router: '路由器',
    host: '主机',
    controller: '控制器',
    server: '服务器',
    p4_switch: 'P4 交换机',
  }

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
          <span className={styles['item-label']}>{typeLabels[item.label] ?? item.label}数量:</span>
          <span className={styles['item-value']}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
