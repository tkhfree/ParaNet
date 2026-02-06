import React, { useEffect, useRef, useState } from 'react'
import { Form, Input, Modal } from 'antd'
import type { ILink, ILinkAddedEvent } from '@/model/topology'
import type { Editor } from '../../topology-engine'

interface IProps {
  editor: Editor
}

export const CreateLinkDialog: React.FC<IProps> = ({ editor }) => {
  const [form] = Form.useForm<ILink>()
  const [visible, setVisible] = useState(false)
  const [edit, setEdit] = useState(false)
  const oldName = useRef('')

  useEffect(() => {
    const onAddLink = (event: ILinkAddedEvent) => {
      setVisible(true)
      setEdit(false)
      const { source, target } = event
      form.resetFields()
      form.setFieldValue('src', { device: source, port: '' })
      form.setFieldValue('dst', { device: target, port: '' })
    }
    editor.bus.on('LINK_ADDED', onAddLink)
    return () => editor.bus.off('LINK_ADDED', onAddLink)
  }, [editor, form])

  useEffect(() => {
    editor.graphManager.onEdgeClick = (data: ILink) => {
      setEdit(true)
      setVisible(true)
      form.resetFields()
      form.setFieldsValue(data)
      oldName.current = data.link
    }
    return () => {
      editor.graphManager.onEdgeClick = undefined
    }
  }, [editor, form])

  const onOk = () => form.submit()
  const onCancel = () => setVisible(false)

  const onFinish = (values: ILink & { bandwidth?: string | number }) => {
    const bandwidth = Number(values.bandwidth) || 0
    const payload: ILink = { ...values, bandwidth }
    const { src, dst } = payload
    if (edit) {
      if (editor.checkPortExit(src.device, src.port, oldName.current)) {
        form.setFields([{ name: ['src', 'port'], errors: ['SRC 端口被占用'] }])
        return
      }
      if (editor.checkPortExit(dst.device, dst.port, oldName.current)) {
        form.setFields([{ name: ['dst', 'port'], errors: ['DST 端口被占用'] }])
        return
      }
      editor.editLink(oldName.current, payload)
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
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item name="link" label="Link" rules={[{ required: true, message: '请输入 Link' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="SRC" />
        <Form.Item name={['src', 'device']} label="device">
          <Input readOnly />
        </Form.Item>
        <Form.Item name={['src', 'port']} label="port" rules={[{ required: true, message: '请输入 port' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="DST" />
        <Form.Item name={['dst', 'device']} label="device">
          <Input readOnly />
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
