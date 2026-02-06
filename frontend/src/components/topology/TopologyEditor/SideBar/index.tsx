import React, { useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { DeviceElement, IDevice } from '@/model/topology'
import type { Editor } from '../../topology-engine'
import { BUILT_IN_DEVICES } from '../../topology-engine'
import { CreateDeviceDialog } from '../CreateDeviceDialog'
import styles from './index.module.less'

interface IProps {
  editor: Editor
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  switch: '交换机',
  router: '路由器',
  host: '主机',
  controller: '控制器',
  server: '服务器',
  p4_switch: 'P4 交换机',
}

export const SideBar: React.FC<IProps> = ({ editor }) => {
  const [filter, setFilter] = useState('')
  const [createVisible, setCreateVisible] = useState(false)
  const [deviceType, setDeviceType] = useState('')

  const devices: DeviceElement[] = [...BUILT_IN_DEVICES]
  const filtered = devices.filter((d) =>
    (DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType).toLowerCase().includes(filter.toLowerCase())
  )

  const onClickItem = (item: DeviceElement) => {
    setDeviceType(item.deviceModel)
    setCreateVisible(true)
  }

  const onConfirm = (device: IDevice) => {
    editor?.addDevice(device)
  }

  return (
    <div className={styles.container}>
      <Input
        placeholder="搜索"
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
            <img
              src={item.picturePath}
              alt={item.deviceType}
              width={90}
              height={42}
              style={{ objectFit: 'contain' }}
            />
            <div className={styles.title}>{DEVICE_TYPE_LABELS[item.deviceType] ?? item.deviceType}</div>
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
