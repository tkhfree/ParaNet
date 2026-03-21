import React, { useEffect, useRef, useState } from 'react'
import { Divider, Form, Input, Modal } from 'antd'
import type { IDevice, ITopologyDevice } from '@/model/topology'
import type { Editor } from '../../topology-engine'

interface IProps {
  editor: Editor
}

export const EditDeviceDialog: React.FC<IProps> = ({ editor }) => {
  const [form] = Form.useForm<IDevice>()
  const [visible, setVisible] = useState(false)
  const oldName = useRef<string>('')

  useEffect(() => {
    const onNodeClick = (data: ITopologyDevice) => {
      const { 设备名称, 设备型号, 设备形态, 端口形态, 交换容量, 包转发率, CPU系统, SSD } = data
      oldName.current = 设备名称
      form.setFieldsValue({
        deviceName: 设备名称,
        deviceClass: 设备型号,
        deviceForm: 设备形态,
        portForm: 端口形态,
        capacity: 交换容量,
        rate: 包转发率,
        system: CPU系统,
        ssd: SSD,
        sshHost: '',
        sshPort: '22',
        sshUsername: '',
        sshPassword: '',
      })
      setVisible(true)
    }
    editor.graphManager.onNodeContextClick = onNodeClick
    return () => {
      editor.graphManager.onNodeContextClick = undefined
    }
  }, [editor, form])

  const onOk = () => form.submit()
  const onCancel = () => setVisible(false)

  const onFinish = (values: IDevice) => {
    const { deviceClass, deviceName, deviceForm, portForm, capacity, rate, system, ssd } = values
    const data: ITopologyDevice = {
      设备名称: deviceName,
      设备型号: deviceClass,
      设备形态: deviceForm,
      端口形态: portForm,
      交换容量: capacity,
      包转发率: rate,
      CPU系统: system,
      SSD: ssd,
    }
    if (oldName.current !== deviceName && editor.graphManager.getDevice(deviceName)) {
      form.setFields([{ name: 'deviceName', errors: ['设备名称重复'] }])
      return
    }
    editor.graphManager.updateDevice(oldName.current, data)
    setVisible(false)
  }

  return (
    <Modal title="编辑设备" open={visible} onOk={onOk} onCancel={onCancel} width={640}>
      <Form labelCol={{ span: 5 }} wrapperCol={{ span: 19 }} form={form} onFinish={onFinish}>
        <Form.Item
          name="deviceName"
          label="设备名称"
          rules={[{ required: true, message: '请输入设备名称' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="deviceClass" label="设备型号" rules={[{ required: true }]}>
          <Input readOnly />
        </Form.Item>
        <Form.Item name="deviceForm" label="设备形态">
          <Input />
        </Form.Item>
        <Form.Item name="portForm" label="端口形态">
          <Input />
        </Form.Item>
        <Form.Item name="capacity" label="交换容量">
          <Input />
        </Form.Item>
        <Form.Item name="rate" label="包转发率">
          <Input />
        </Form.Item>
        <Form.Item name="system" label="CPU系统">
          <Input />
        </Form.Item>
        <Form.Item name="ssd" label="SSD">
          <Input />
        </Form.Item>
        <Divider orientation="left" plain>
          SSH 连接（画布拓扑为 D3 引擎时请使用右侧开发页编辑）
        </Divider>
        <Form.Item name="sshHost" label="SSH 主机">
          <Input />
        </Form.Item>
        <Form.Item name="sshPort" label="SSH 端口">
          <Input placeholder="22" />
        </Form.Item>
        <Form.Item name="sshUsername" label="SSH 用户名">
          <Input />
        </Form.Item>
        <Form.Item name="sshPassword" label="SSH 密码">
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  )
}
