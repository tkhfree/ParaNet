import styles from './index.module.less'

import React, { useEffect, useMemo, useState } from 'react'
import { Editor } from '../../topology-engine'
import { ITopologyDevice } from '../../types'
import { getDeployCountByProjectId } from '@/api/record'

interface IItem {
  label: string
  value: number
}

interface IProps {
  projectId: string
  editor: Editor
  title: string
}

export const TopologyInfoPanel = (props: IProps) => {
  const { editor, title, projectId } = props
  const [devices, setDevices] = useState<IItem[]>([])
  const [loaded, setLoaded] = useState(0)
  const [deployed, setDeployed] = useState(0)

  useEffect(() => {
    const fetchData = async (projectId: string) => {
      const response = await getDeployCountByProjectId(projectId)

      setLoaded(response.data.compileCount)
      setDeployed(response.data.deployCount)
    }
    if (projectId) {
      fetchData(projectId)
    }
  }, [projectId])

  useEffect(() => {
    const refreshDevices = () => {
      const datas: Record<string, number> = {}

      const elements = editor.graphManager.graph.getNodes()

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i].data as ITopologyDevice

        const deviceName = element.设备型号

        if (datas[deviceName]) {
          datas[deviceName]++
        } else {
          datas[deviceName] = 1
        }
      }

      const devices: IItem[] = []

      Object.entries(datas).forEach(item => devices.push({ label: item[0], value: item[1] }))

      setDevices(devices)
    }

    editor.bus.on('GRAPH_DESERIALIZE', refreshDevices)
    editor.bus.on('CELL_ADDED', refreshDevices)
    editor.bus.on('CELL_REMOVED', refreshDevices)
    return () => {
      editor.bus.off('GRAPH_DESERIALIZE', refreshDevices)
      editor.bus.off('CELL_ADDED', refreshDevices)
      editor.bus.off('CELL_REMOVED', refreshDevices)
    }
  }, [editor])

  const loadDevices = useMemo(() => {
    const datas = devices.map(item => {
      const type = editor.devices.find(element => element.deviceModel === item.label)
      return { ...item, label: type?.deviceType }
    })
    return datas
  }, [devices, editor])

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <span className={styles.itemLabel}>名称:</span>
        <span className={styles.itemValue} title={title}>
          {title}
        </span>
      </div>
      {loadDevices.map(item => (
        <div className={styles.item} key={item.label}>
          <span className={styles.itemLabel}>{item.label}数量:</span>
          <span className={styles.itemValue}>{item.value}</span>
        </div>
      ))}
      <div className={styles.item}>
        <span className={styles.itemLabel}>已部署模态数量:</span>
        <span className={styles.itemValue}>{deployed}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.itemLabel}>已编译模态数量:</span>
        <span className={styles.itemValue}>{loaded}</span>
      </div>
    </div>
  )
}
