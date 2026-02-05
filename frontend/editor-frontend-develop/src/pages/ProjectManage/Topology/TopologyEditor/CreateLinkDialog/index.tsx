import { Form, Input, message, Modal } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { ILink, ILinkAddedEvent } from '../../types'
import { Editor } from '../../topology-engine'

interface IProps {
  editor: Editor
}

export const CreateLinkDialog = (props: IProps) => {
  const { editor } = props
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
    return () => {
      editor.bus.off('LINK_ADDED', onAddLink)
    }
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

  const onFinish = (values: ILink) => {
    console.log(values)

    // 判断端口是否被占用
    const { src, dst } = values
    if (edit) {
      if (editor.checkPortExit(src.device, src.port, oldName.current)) {
        message.info('SRC端口被占用')
        return
      }
      if (editor.checkPortExit(dst.device, dst.port, oldName.current)) {
        message.info('DST端口被占用')
        return
      }
      editor.editLink(oldName.current, values)
    } else {
      if (editor.checkPortExit(src.device, src.port)) {
        message.info('SRC端口被占用')
        return
      }
      if (editor.checkPortExit(dst.device, dst.port)) {
        message.info('DST端口被占用')
        return
      }

      editor.addLink(values)
    }

    setVisible(false)
  }

  return (
    <Modal
      width={600}
      title={edit ? '编辑模态' : '新建模态'}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
    >
      <Form labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} form={form} onFinish={onFinish}>
        <Form.Item name="link" label="Link" rules={[{ required: true, message: '请输入Link' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="SRC"></Form.Item>
        <Form.Item name={['src', 'device']} label="device">
          <Input readOnly />
        </Form.Item>
        <Form.Item
          name={['src', 'port']}
          label="port"
          rules={[{ required: true, message: '请输入Link' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="DST"></Form.Item>
        <Form.Item name={['dst', 'device']} label="device">
          <Input readOnly />
        </Form.Item>
        <Form.Item
          name={['dst', 'port']}
          label="port"
          rules={[{ required: true, message: '请输入Port' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="bandwidth"
          label="Bandwidth"
          rules={[{ required: true, message: '请输入Bandwidth' }]}
        >
          <Input type="number" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
