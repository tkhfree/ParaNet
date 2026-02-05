import { UploadImage } from '@/components'
import { Button, Form, Input, Modal, Select } from 'antd'
import React, { useMemo, useState } from 'react'
import { DeviceElement } from '../../../types'
import { deleteElement, updateElement } from '@/api/element'
import { message } from '@/App'

interface IFormData {
  id: string
  deviceModel: string
  oldDeviceType: string
  newDeviceType: string
  files: { name: string; url: string }[]
}

interface IProps {
  devices: DeviceElement[]
  visible: boolean
  setVisible: (visible: boolean) => void
  onConfirm: () => void
}

export const EditDeviceDialog = (props: IProps) => {
  const { devices, visible, setVisible, onConfirm } = props
  const [form] = Form.useForm<IFormData>()
  const [loading, setLoading] = useState(false)

  const onOk = () => {
    form.submit()
  }

  const onCancel = () => {
    setVisible(false)
  }

  const onDelete = async () => {
    const id = form.getFieldValue('id')
    if (id) {
      try {
        setLoading(true)
        await deleteElement(id)
        message.info('删除成功')
        setVisible(false)
        onConfirm()
      } finally {
        setLoading(false)
      }
    } else {
      message.info('请选择图元')
    }
  }

  const onFinish = async (values: IFormData) => {
    console.log(values)
    const { id, newDeviceType, deviceModel, files } = values
    const { name, url } = files[0]

    try {
      setLoading(true)

      await updateElement(id, newDeviceType, deviceModel, name, url)

      setVisible(false)
      onConfirm()
    } finally {
      setLoading(false)
    }
  }

  const options = useMemo(
    () => devices.map(item => ({ label: item.deviceType, value: item.deviceType })),
    [devices],
  )

  const onSelectDevice = (value: string) => {
    const device = devices.find(item => item.deviceType === value)

    if (!device) return

    form.setFieldsValue({
      id: device.id,
      newDeviceType: device.deviceType,
      deviceModel: device.deviceModel,
      files: device.picturePath ? [{ name: device.pictureName, url: device.picturePath }] : [],
    })
  }

  return (
    <Modal
      title="编辑图元"
      loading={loading}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      footer={[
        <Button key="link" type="default" danger loading={loading} onClick={onDelete}>
          删除
        </Button>,
        <Button key="back" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={onOk}>
          确定
        </Button>,
      ]}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item
          name="oldDeviceType"
          label="选择图元"
          rules={[{ required: true, message: '请选择图元' }]}
        >
          <Select options={options} placeholder="请选择图元" onSelect={onSelectDevice} />
        </Form.Item>
        <Form.Item
          name="id"
          label="设备ID"
          rules={[{ required: true, message: '请输入设备类型' }]}
          style={{ display: 'none' }}
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
          name="newDeviceType"
          label="设备类型"
          rules={[{ required: true, message: '请输入设备类型' }]}
        >
          <Input placeholder="请输入设备类型" />
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
