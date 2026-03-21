/**
 * D3 版本设备编辑对话框
 */

import React, { useEffect, useRef, useState } from 'react'
import { App, Button, Divider, Form, Input, Modal, Select } from 'antd'
import type { IDevice, NodeConfig } from '@/model/topology'
import type { D3Editor, D3Node } from '../../d3-engine'

interface IProps {
  editor: D3Editor
}

function parseSshPortString(raw: string | undefined): number {
  const n = parseInt(String(raw ?? '').trim(), 10)
  if (Number.isNaN(n) || n < 1 || n > 65535) return 22
  return n
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
      const cfg = (node.config ?? {}) as NodeConfig

      form.setFieldsValue({
        deviceName: node.name,
        deviceClass: node.type,
        dataPlaneTarget: (node.properties?.dataPlaneTarget as string) || 'bmv2',
        deviceForm: (node.properties?.deviceForm as string) || '',
        portForm: (node.properties?.portForm as string) || '',
        capacity: (node.properties?.capacity as string) || '',
        rate: (node.properties?.rate as string) || '',
        system: (node.properties?.system as string) || '',
        ssd: (node.properties?.ssd as string) || '',
        sshHost: cfg.sshHost ?? '',
        sshPort: cfg.sshPort != null ? String(cfg.sshPort) : '22',
        sshUsername: cfg.sshUsername ?? '',
        sshPassword: '',
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
    const { deviceName, deviceForm, portForm, capacity, rate, system, ssd, dataPlaneTarget } = values

    const existingNode = editor.getNodeByName(deviceName)
    if (existingNode && existingNode.id !== oldNodeId.current) {
      form.setFields([{ name: 'deviceName', errors: ['设备名称重复'] }])
      return
    }

    const node = editor.getNodeById(oldNodeId.current)
    if (!node) {
      message.error('节点已不存在')
      return
    }
    const prevCfg = (node.config ?? {}) as NodeConfig

    const nextConfig: NodeConfig = {
      ...prevCfg,
      protocol: 'ssh',
      sshHost: values.sshHost.trim(),
      sshPort: parseSshPortString(values.sshPort),
      sshUsername: values.sshUsername.trim(),
    }
    if (values.sshPassword?.trim()) {
      nextConfig.sshPassword = values.sshPassword.trim()
    } else if (prevCfg.sshPassword) {
      nextConfig.sshPassword = prevCfg.sshPassword
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
        dataPlaneTarget: dataPlaneTarget ?? 'bmv2',
      },
      config: nextConfig,
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
      width={640}
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
          extra="编译时为本节点生成对应形态的 P4"
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
        >
          <Input autoComplete="off" />
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
          <Input autoComplete="off" />
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
          extra="留空则不修改已保存的密码"
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
