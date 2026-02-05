import styles from './index.module.less'

import React, { useEffect, useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { CreateDeviceDialog } from '../CreateDeviceDialog'
import { DeviceElement, IDevice } from '../../types'
import { Editor } from '../../topology-engine'
import { DynamicIcon } from '@/components'
import { AddDeviceDialog } from './AddDeviceDialog'
import { EditDeviceDialog } from './EditDeviceDialog'
import { getElements } from '@/api/element'
import { DeviceImage } from './DeviceImage'

interface IProps {
  editor: Editor
}

export const SideBar = (props: IProps) => {
  const { editor } = props
  const [visible1, setVisible1] = useState(false)
  const [visible2, setVisible2] = useState(false)
  const [visible3, setVisible3] = useState(false)
  const [deviceType, setDeviceType] = useState('') // 设备型号
  const [filter, setFilter] = useState('')
  const [devices, setDevices] = useState<DeviceElement[]>([])

  const fetchData = async () => {
    const response = await getElements(0)
    console.log(response)
    setDevices(response.data)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onClickItem = (item: DeviceElement) => {
    setDeviceType(item.deviceModel)
    setVisible1(true)
  }

  const onConfirm1 = (device: IDevice) => editor?.addDevice(device)

  const onClickAdd = () => setVisible2(true)
  const onClickEdit = () => setVisible3(true)

  const onConfirm2 = () => {
    fetchData()
    editor.init()
  }
  const onConfirm3 = () => {
    fetchData()

    editor.init()
  }

  return (
    <div className={styles.container}>
      <Input
        placeholder="搜索"
        className={styles.search}
        suffix={<SearchOutlined />}
        onChange={e => setFilter(e.target.value)}
      />
      <div className={styles.content}>
        {devices
          .filter(item => item.deviceType.includes(filter))
          .map(item => (
            <div
              className={styles.item}
              key={item.picturePath || item.id}
              onClick={() => onClickItem(item)}
            >
              <DeviceImage url={item.id} />
              <div className={styles.title}>{item.deviceType}</div>
            </div>
          ))}
      </div>
      <div className={styles.bottom}>
        <div className={styles.bottomItem} onClick={onClickEdit}>
          <DynamicIcon name="edit-symbol" />
          <span>编辑图元</span>
        </div>
        <div className={styles.bottomItem} onClick={onClickAdd}>
          <DynamicIcon name="new-symbol" />
          <span>新增图元</span>
        </div>
      </div>
      {visible1 && (
        <CreateDeviceDialog
          deviceClass={deviceType}
          visible={visible1}
          setVisible={setVisible1}
          onConfirm={onConfirm1}
        />
      )}
      {visible2 && (
        <AddDeviceDialog visible={visible2} setVisible={setVisible2} onConfirm={onConfirm2} />
      )}
      {visible3 && (
        <EditDeviceDialog
          devices={devices}
          visible={visible3}
          setVisible={setVisible3}
          onConfirm={onConfirm3}
        />
      )}
    </div>
  )
}
