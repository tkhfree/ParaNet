import React, { useEffect } from 'react'
import { Divider, Form, Input, Modal, Select } from 'antd'
import type { IDevice } from '@/model/topology'

interface IProps {
  title?: string
  deviceClass: string
  visible: boolean
  setVisible: (v: boolean) => void
  onConfirm: (device: IDevice) => void
  initialValues?: Partial<IDevice>
}

const defaultSsh = {
  sshHost: '',
  sshPort: '22',
  sshUsername: '',
  sshPassword: '',
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
      dataPlaneTarget: 'bmv2',
      ...defaultSsh,
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
    <Modal title={title} open={visible} onOk={onOk} onCancel={onCancel} width={640}>
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
        <Form.Item
          name="dataPlaneTarget"
          label="数据面目标"
          extra="编译时为本节点生成对应形态的 P4（与拓扑 capabilities.dataPlaneTarget 一致）"
        >
          <Select
            options={[
              { value: 'bmv2', label: 'BMv2 (v1model)' },
              { value: 'tofino', label: 'Tofino (TNA)' },
              { value: 'stub', label: '占位 stub' },
            ]}
          />
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
          SSH 连接（与真实设备管理地址对应）
        </Divider>

        <Form.Item
          name="sshHost"
          label="SSH 主机"
          rules={[{ required: true, message: '请输入设备 IP 或主机名' }]}
          extra="用于与真实设备建立 SSH 会话的管理面地址"
        >
          <Input placeholder="例：192.168.1.10 或 sw1.example.com" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="sshPort"
          label="SSH 端口"
          rules={[
            {
              validator: async (_, v) => {
                const s = String(v ?? '').trim()
                if (!s) return
                const n = parseInt(s, 10)
                if (Number.isNaN(n) || n < 1 || n > 65535) {
                  throw new Error('端口范围为 1–65535')
                }
              },
            },
          ]}
        >
          <Input placeholder="默认 22" autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="sshUsername"
          label="SSH 用户名"
          rules={[{ required: true, message: '请输入 SSH 登录用户名' }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="sshPassword"
          label="SSH 密码"
          extra="可选；若使用密钥认证可留空，后续可在部署/运维侧配置密钥"
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
