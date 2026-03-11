/**
 * D3 版本侧边栏
 */

import React, { useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { IDevice } from '@/model/topology'
import type { D3Editor } from '../../d3-engine'
import { DEVICE_COLORS } from '../../d3-engine'
import { CreateDeviceDialog } from '../CreateDeviceDialog'
import styles from './index.module.less'

interface IProps {
  editor: D3Editor
}

const DEVICE_TYPES = [
  { id: 'switch', type: 'switch', label: '交换机' },
  { id: 'router', type: 'router', label: '路由器' },
  { id: 'host', type: 'host', label: '主机' },
  { id: 'controller', type: 'controller', label: '控制器' },
  { id: 'server', type: 'server', label: '服务器' },
  { id: 'p4_switch', type: 'p4_switch', label: 'P4 交换机' },
]

export const D3SideBar: React.FC<IProps> = ({ editor }) => {
  const [filter, setFilter] = useState('')
  const [createVisible, setCreateVisible] = useState(false)
  const [deviceType, setDeviceType] = useState('')

  const filtered = DEVICE_TYPES.filter((d) =>
    d.label.toLowerCase().includes(filter.toLowerCase())
  )

  const onClickItem = (item: typeof DEVICE_TYPES[0]) => {
    setDeviceType(item.type)
    setCreateVisible(true)
  }

  const onConfirm = (device: IDevice) => {
    editor?.addDevice(device)
  }

  return (
    <div className={styles.container}>
      <Input
        placeholder="搜索设备"
        className={styles.search}
        suffix={<SearchOutlined />}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className={styles.content}>
        {filtered.map((item) => (
          <div
            className={styles.item}
            key={item.id}
            onClick={() => onClickItem(item)}
          >
            <div
              style={{
                width: 90,
                height: 42,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                background: DEVICE_COLORS[item.type as keyof typeof DEVICE_COLORS] + '20',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: DEVICE_COLORS[item.type as keyof typeof DEVICE_COLORS],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 18,
                }}
              >
                {item.label[0]}
              </div>
            </div>
            <div className={styles.title}>{item.label}</div>
          </div>
        ))}
      </div>
      {createVisible && (
        <CreateDeviceDialog
          deviceClass={deviceType}
          visible={createVisible}
          setVisible={setCreateVisible}
          onConfirm={onConfirm}
        />
      )}
    </div>
  )
}
