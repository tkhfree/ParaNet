/**
 * D3 版本侧边栏
 */

import React, { useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { DEVICE_COLORS, DEVICE_IMAGE_MAP, DEVICE_NAMES } from '../../d3-engine'
import {
  clearActiveDraggedDeviceType,
  DEVICE_DRAG_FALLBACK_MIME_TYPE,
  DEVICE_DRAG_MIME_TYPE,
  setActiveDraggedDeviceType,
} from '../../d3-engine/dragDrop'
import styles from './index.module.less'

interface IProps {
  onCreateRequest: (deviceType: string) => void
}

const DEVICE_TYPES = [
  { id: 'switch', type: 'switch', label: DEVICE_NAMES.switch },
  { id: 'router', type: 'router', label: DEVICE_NAMES.router },
  { id: 'host', type: 'host', label: DEVICE_NAMES.host },
  { id: 'controller', type: 'controller', label: DEVICE_NAMES.controller },
  { id: 'server', type: 'server', label: DEVICE_NAMES.server },
  { id: 'p4_switch', type: 'p4_switch', label: DEVICE_NAMES.p4_switch },
]

export const D3SideBar: React.FC<IProps> = ({ onCreateRequest }) => {
  const [filter, setFilter] = useState('')

  const attachDragData = (event: React.DragEvent<HTMLDivElement>, deviceType: string) => {
    setActiveDraggedDeviceType(deviceType)
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(DEVICE_DRAG_MIME_TYPE, deviceType)
    event.dataTransfer.setData(DEVICE_DRAG_FALLBACK_MIME_TYPE, deviceType)
  }

  const filtered = DEVICE_TYPES.filter((d) =>
    d.label.toLowerCase().includes(filter.toLowerCase())
  )

  const onClickItem = (item: typeof DEVICE_TYPES[0]) => {
    onCreateRequest(item.type)
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
            draggable
            onDragStart={(event) => {
              attachDragData(event, item.type)
            }}
            onDragEnd={() => {
              clearActiveDraggedDeviceType()
            }}
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
              <img
                src={DEVICE_IMAGE_MAP[item.type as keyof typeof DEVICE_IMAGE_MAP]}
                alt={item.label}
                draggable={false}
                style={{
                  width: 72,
                  height: 34,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))',
                }}
              />
            </div>
            <div className={styles.title}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
