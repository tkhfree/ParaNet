import React, { useEffect } from 'react'
import { Form, Input, Modal } from 'antd'
import type { IDevice } from '@/model/topology'

interface IProps {
  title?: string
  deviceClass: string
  visible: boolean
  setVisible: (v: boolean) => void
  onConfirm: (device: IDevice) => void
  initialValues?: Partial<IDevice>
}

export const CreateDeviceDialog: React.FC<IProps> = ({
  title = '新建设备',
  deviceClass,
  visible,
  setVisible,
  onConfirm,
  initialValues,
}) => {
  const [form] = Form.useForm<IDevice>()

  useEffect(() => {
    if (!visible) return
    form.setFieldsValue({
      deviceClass,
      ...initialValues,
    })
  }, [deviceClass, form, initialValues, visible])

  const onOk = () => form.submit()
  const onCancel = () => {
    form.resetFields()
    setVisible(false)
  }

  const onFinish = (values: IDevice) => {
    onConfirm(values)
    form.resetFields()
    setVisible(false)
  }

  return (
    <Modal title={title} open={visible} onOk={onOk} onCancel={onCancel}>
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
