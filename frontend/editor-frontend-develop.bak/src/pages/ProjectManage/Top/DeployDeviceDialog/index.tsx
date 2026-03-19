import { getTopologyDetail } from '@/api/file'
import { Form, Modal, Select } from 'antd'
import React, { useEffect, useState } from 'react'
import { ITopology } from '../../Topology/types'
import { getElements } from '@/api/element'

interface IDeviceType {
  label: string
  value: string
}

interface IDevice {
  label: string
  value: string
  type: string
}

export interface IFormData {
  deviceType: string
  deviceName: string
}

interface IProps {
  projectId: string
  visible: boolean
  setVisible: (visible: boolean) => void
  onConfirm: (ip: string) => void
}

export const DeployDeviceDialog = (props: IProps) => {
  const { projectId, visible, setVisible, onConfirm } = props
  const [form] = Form.useForm<IFormData>()
  const [devices, setDevices] = useState<IDevice[]>([])
  const [deviceTypes, setDeviceTypes] = useState<IDeviceType[]>([])
  const [deviceType, setDeviceType] = useState('')

  const getDeviceTypes = async (devices: Set<string>) => {
    const response = await getElements(1)

    return response.data
      .filter((item: any) => devices.has(item.deviceModel))
      .map((item: any) => ({ label: item.deviceType, value: item.deviceModel }))
  }

  useEffect(() => {
    const fetchData = async (projectId: string) => {
      const response = await getTopologyDetail(projectId)
      const project = JSON.parse(response.data) as ITopology

      const devices: IDevice[] = []
      const deviceTypes = new Set<string>()
      Object.entries(project.deviceStaticInfo).forEach(item => {
        const [name, device] = item
        devices.push({
          label: name,
          value: name,
          type: device.设备型号,
        })
        deviceTypes.add(device.设备型号)
      })

      const deviceClasses = await getDeviceTypes(deviceTypes)

      setDevices(devices)
      setDeviceTypes(deviceClasses)
    }
    if (projectId && visible) {
      fetchData(projectId)
    }
  }, [projectId, visible])

  const onOk = () => {
    form.submit()
  }

  const onCancel = () => {
    setVisible(false)
  }

  const onFinish = (values: IFormData) => {
    onConfirm(values.deviceName)

    setVisible(false)
  }

  return (
    <Modal title="发送到设备" open={visible} onOk={onOk} onCancel={onCancel}>
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item
          name="deviceType"
          label="设备类型"
          rules={[{ required: true, message: '请选择设备类型' }]}
        >
          <Select options={deviceTypes} placeholder="请选择设备类型" onChange={setDeviceType} />
        </Form.Item>
        <Form.Item
          name="deviceName"
          label="选择设备"
          rules={[{ required: true, message: '请选择设备' }]}
        >
          <Select
            options={devices.filter(item => item.type === deviceType)}
            placeholder="请选择设备"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
