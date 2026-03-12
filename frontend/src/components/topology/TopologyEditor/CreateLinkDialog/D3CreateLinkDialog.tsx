/**
 * D3 版本连线创建/编辑对话框
 */

import React, { useEffect, useRef, useState } from 'react'
import { App, Button, Form, Input, Modal, Select } from 'antd'
import type { ILink } from '@/model/topology'
import type { D3Editor, D3Link } from '../../d3-engine'

interface IProps {
  editor: D3Editor
}

export const D3CreateLinkDialog: React.FC<IProps> = ({ editor }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm<ILink>()
  const [visible, setVisible] = useState(false)
  const [edit, setEdit] = useState(false)
  const oldLinkId = useRef('')
  const deviceOptions = editor.nodes.map((node) => ({
    label: node.name,
    value: node.name,
  }))

  const openCreateForm = (source?: string, target?: string) => {
    const nodes = editor.nodes
    const fallbackSource = source ?? nodes[0]?.name ?? ''
    const fallbackTarget =
      target ?? nodes.find((node) => node.name !== fallbackSource)?.name ?? nodes[0]?.name ?? ''

    setVisible(true)
    setEdit(false)
    oldLinkId.current = ''
    form.resetFields()
    form.setFieldsValue({
      link: `link_${Date.now()}`,
      src: { device: fallbackSource, port: '' },
      dst: { device: fallbackTarget, port: '' },
      bandwidth: 1000,
    })
  }

  // 监听连线添加事件
  useEffect(() => {
    const onLinkAdded = (event: { source: string; target: string }) => {
      openCreateForm(event.source, event.target)
    }
    editor.bus.on('LINK_ADDED', onLinkAdded)
    return () => editor.bus.off('LINK_ADDED', onLinkAdded)
  }, [editor, form])

  useEffect(() => {
    const onCreateRequested = (event?: { source?: string; target?: string }) => {
      openCreateForm(event?.source, event?.target)
    }
    editor.bus.on('LINK_CREATE_REQUESTED', onCreateRequested)
    return () => editor.bus.off('LINK_CREATE_REQUESTED', onCreateRequested)
  }, [editor, form])

  // 监听连线点击事件
  useEffect(() => {
    const onLinkClick = (event: { link: D3Link; x: number; y: number }) => {
      const link = event.link
      setEdit(true)
      setVisible(true)
      oldLinkId.current = link.id

      const srcId = typeof link.source === 'string' ? link.source : link.source.id
      const tgtId = typeof link.target === 'string' ? link.target : link.target.id
      const srcNode = editor.getNodeById(srcId)
      const tgtNode = editor.getNodeById(tgtId)

      form.resetFields()
      form.setFieldsValue({
        link: link.id,
        src: { device: srcNode?.name || '', port: link.sourcePort || '' },
        dst: { device: tgtNode?.name || '', port: link.targetPort || '' },
        bandwidth: link.bandwidth,
      })
    }
    editor.bus.on('LINK_CLICK', onLinkClick)
    return () => editor.bus.off('LINK_CLICK', onLinkClick)
  }, [editor, form])

  const onOk = () => form.submit()
  const onCancel = () => setVisible(false)

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除连线',
      content: '删除后将从当前拓扑中移除该链路，是否继续？',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const removed = editor.removeLink(oldLinkId.current)
        if (removed) {
          message.success('连线已删除')
          setVisible(false)
          return
        }
        message.warning('连线删除失败，请重试')
      },
    })
  }

  const onFinish = (values: ILink & { bandwidth?: string | number }) => {
    const bandwidth = Number(values.bandwidth) || 0
    const payload: ILink = { ...values, bandwidth }
    const { src, dst } = payload

    if (src.device === dst.device) {
      form.setFields([{ name: ['dst', 'device'], errors: ['源设备和目标设备不能相同'] }])
      return
    }

    if (edit) {
      if (editor.checkPortExit(src.device, src.port, oldLinkId.current)) {
        form.setFields([{ name: ['src', 'port'], errors: ['SRC 端口被占用'] }])
        return
      }
      if (editor.checkPortExit(dst.device, dst.port, oldLinkId.current)) {
        form.setFields([{ name: ['dst', 'port'], errors: ['DST 端口被占用'] }])
        return
      }
      editor.updateLink(oldLinkId.current, {
        id: values.link,
        sourcePort: src.port,
        targetPort: dst.port,
        bandwidth,
      })
    } else {
      if (editor.checkPortExit(src.device, src.port)) {
        form.setFields([{ name: ['src', 'port'], errors: ['SRC 端口被占用'] }])
        return
      }
      if (editor.checkPortExit(dst.device, dst.port)) {
        form.setFields([{ name: ['dst', 'port'], errors: ['DST 端口被占用'] }])
        return
      }
      editor.addLink(payload)
    }
    setVisible(false)
  }

  return (
    <Modal
      width={600}
      title={edit ? '编辑连线' : '新建连线'}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      footer={[
        ...(edit
          ? [
              <Button key="delete" danger onClick={handleDelete}>
                删除连线
              </Button>,
            ]
          : []),
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={onOk}>
          {edit ? '保存' : '创建'}
        </Button>,
      ]}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item name="link" label="Link" rules={[{ required: true, message: '请输入 Link' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="SRC" />
        <Form.Item name={['src', 'device']} label="device" rules={[{ required: true, message: '请选择源设备' }]}>
          <Select options={deviceOptions} placeholder="选择源设备" />
        </Form.Item>
        <Form.Item name={['src', 'port']} label="port" rules={[{ required: true, message: '请输入 port' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="DST" />
        <Form.Item name={['dst', 'device']} label="device" rules={[{ required: true, message: '请选择目标设备' }]}>
          <Select options={deviceOptions} placeholder="选择目标设备" />
        </Form.Item>
        <Form.Item name={['dst', 'port']} label="port" rules={[{ required: true, message: '请输入 port' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="bandwidth" label="Bandwidth" rules={[{ required: true, message: '请输入 Bandwidth' }]}>
          <Input type="number" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
