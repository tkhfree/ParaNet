import { createElement } from '@/api/element'
import { UploadImage } from '@/components'
import { Form, Input, Modal } from 'antd'
import React, { useState } from 'react'

interface IFormData {
  deviceType: string
  deviceModel: string
  files: { name: string; url: string }[]
}

interface IProps {
  visible: boolean
  setVisible: (visible: boolean) => void
  onConfirm: () => void
}

export const AddDeviceDialog = (props: IProps) => {
  const { visible, setVisible, onConfirm } = props
  const [form] = Form.useForm<IFormData>()
  const [loading, setLoading] = useState(false)

  const onOk = () => {
    form.submit()
  }

  const onCancel = () => {
    setVisible(false)
  }

  const onFinish = async (values: IFormData) => {
    console.log(values)
    const { deviceType, deviceModel, files } = values
    const { name, url } = files[0]

    try {
      setLoading(true)

      await createElement(deviceType, deviceModel, name, url)

      setVisible(false)
      onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="新建图元" loading={loading} open={visible} onOk={onOk} onCancel={onCancel}>
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item
          name="deviceType"
          label="设备类型"
          rules={[{ required: true, message: '请输入设备类型' }]}
        >
          <Input placeholder="请输入设备类型" />
        </Form.Item>
        <Form.Item
          name="deviceModel"
          label="设备型号"
          rules={[{ required: true, message: '请输入设备型号' }]}
        >
          <Input placeholder="请输入设备型号" />
        </Form.Item>
        <Form.Item
          name="files"
          label="图元图片"
          rules={[{ required: true, message: '请上传图元图片' }]}
        >
          <UploadImage accept={'.png,.svg'} maxCount={1} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
