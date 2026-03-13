/**
 * D3 版本设备编辑对话框
 */

import React, { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Input, Modal } from 'antd'
import type { IDevice } from '@/model/topology'
import type { D3Editor, D3Node } from '../../d3-engine'

interface IProps {
  editor: D3Editor
}

export const D3EditDeviceDialog: React.FC<IProps> = ({ editor }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm<IDevice>()
  const [visible, setVisible] = useState(false)
  const oldNodeId = useRef<string>('')

  useEffect(() => {
    const onNodeContextMenu = (event: { node: D3Node; x: number; y: number }) => {
      const node = event.node
      oldNodeId.current = node.id

      form.setFieldsValue({
        deviceName: node.name,
        deviceClass: node.type,
        deviceForm: (node.properties?.deviceForm as string) || '',
        portForm: (node.properties?.portForm as string) || '',
        capacity: (node.properties?.capacity as string) || '',
        rate: (node.properties?.rate as string) || '',
        system: (node.properties?.system as string) || '',
        ssd: (node.properties?.ssd as string) || '',
      })
      setVisible(true)
    }

    editor.bus.on('NODE_CONTEXTMENU', onNodeContextMenu)
    return () => editor.bus.off('NODE_CONTEXTMENU', onNodeContextMenu)
  }, [editor, form])

  const onOk = () => form.submit()
  const onCancel = () => setVisible(false)

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除设备',
      content: '删除该设备后，相关链路也会一并移除，是否继续？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const removed = editor.removeNode(oldNodeId.current)
        if (removed) {
          message.success('设备已删除')
          setVisible(false)
          return
        }
        message.warning('设备删除失败，请重试')
      },
    })
  }

  const onFinish = (values: IDevice) => {
    const { deviceName, deviceForm, portForm, capacity, rate, system, ssd } = values

    // 检查名称是否重复
    const existingNode = editor.getNodeByName(deviceName)
    if (existingNode && existingNode.id !== oldNodeId.current) {
      form.setFields([{ name: 'deviceName', errors: ['设备名称重复'] }])
      return
    }

    editor.updateDevice(oldNodeId.current, {
      name: deviceName,
      properties: {
        deviceForm,
        portForm,
        capacity,
        rate,
        system,
        ssd,
      },
    })

    message.success('设备信息已更新')
    setVisible(false)
  }

  return (
    <Modal
      title="编辑设备"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      footer={[
        <Button key="delete" danger onClick={handleDelete}>
          删除设备
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={onOk}>
          保存
        </Button>,
      ]}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
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
      </Form>
    </Modal>
  )
}
