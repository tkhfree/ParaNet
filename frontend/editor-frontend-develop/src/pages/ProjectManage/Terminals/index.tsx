import styles from './index.module.less'

import { Tabs } from 'antd'

import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from './Terminal'
import { Logs } from './Logs'
import sideBarStore from '@/stores/side-bar'
import { useShallow } from 'zustand/shallow'
import topologyStore from '@/stores/topology'

type TargetKey = React.MouseEvent | React.KeyboardEvent | string

interface IProps {
  projectId?: string
}

export const Terminals = (props: IProps) => {
  const { projectId } = props
  const [activeKey, setActiveKey] = useState('0')
  const [items, setItems] = useState([
    { label: '日志', key: '0', children: <Logs />, closable: false },
    { label: '终端', key: '1', children: <Terminal /> },
  ])
  const newTabIndex = useRef(0)
  const [terminal] = sideBarStore(useShallow(state => [state.terminal]))
  const clearLogs = topologyStore(useShallow(state => state.clearLogs))
  const lastKey = useRef('1')

  useEffect(() => {
    clearLogs()
  }, [projectId, clearLogs])

  useEffect(() => {
    if (terminal === 'log') {
      setActiveKey('0')
    } else {
      setActiveKey(lastKey.current)
    }
  }, [items, terminal])

  const onChange = (newActiveKey: string) => {
    setActiveKey(newActiveKey)
    lastKey.current = newActiveKey
  }

  const add = () => {
    const newActiveKey = `newTab${newTabIndex.current++}`
    const newPanes = [...items]
    newPanes.push({ label: '终端', children: <Terminal />, key: newActiveKey })
    setItems(newPanes)
    setActiveKey(newActiveKey)
    lastKey.current = newActiveKey
  }

  const remove = (targetKey: TargetKey) => {
    let newActiveKey = activeKey
    let lastIndex = -1
    items.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1
      }
    })
    const newPanes = items.filter(item => item.key !== targetKey)
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].key
      } else {
        newActiveKey = newPanes[0].key
      }
    }
    setItems(newPanes)
    setActiveKey(newActiveKey)
    lastKey.current = newActiveKey
  }

  const onEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'add') {
      add()
    } else {
      remove(targetKey)
    }
  }

  return (
    <div className={styles.container}>
      <Tabs
        type="editable-card"
        onChange={onChange}
        activeKey={activeKey}
        onEdit={onEdit}
        items={items}
      />
    </div>
  )
}
