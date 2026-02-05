import React, { useState } from 'react'
import { Card, Button, Space, Typography, Empty, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, CodeOutlined } from '@ant-design/icons'
import type { IntentType } from '@/model/intent'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

interface CreateIntentForm {
  name: string
  description?: string
  type: IntentType
  content: string
}

const Intent: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form] = Form.useForm<CreateIntentForm>()

  const openCreateModal = () => {
    form.resetFields()
    form.setFieldsValue({ type: 'dsl' })
    setCreateModalOpen(true)
  }

  const handleCreateOk = async () => {
    try {
      const values = await form.validateFields()
      // TODO: 调用 intentApi.create(values)，开发阶段仅做本地提示
      message.success(`意图「${values.name}」创建成功（开发模式）`)
      setCreateModalOpen(false)
    } catch (err) {
      // 表单校验失败
    }
  }

  const handleCreateCancel = () => {
    setCreateModalOpen(false)
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>模态开发智能体</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          创建意图
        </Button>
      </div>

      <Card>
        <Empty
          image={<CodeOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
          description="暂无意图配置，使用 DSL 或自然语言创建您的网络意图"
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            立即创建
          </Button>
        </Empty>
      </Card>

      <Modal
        title="创建意图"
        open={createModalOpen}
        onOk={handleCreateOk}
        onCancel={handleCreateCancel}
        width={560}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'dsl' }}
        >
          <Form.Item
            name="name"
            label="意图名称"
            rules={[{ required: true, message: '请输入意图名称' }]}
          >
            <Input placeholder="例如：园区网路由策略" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="可选，简要描述该意图" />
          </Form.Item>
          <Form.Item
            name="type"
            label="创建方式"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择创建方式">
              <Option value="dsl">DSL 代码</Option>
              <Option value="natural_language">自然语言</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="意图内容"
            rules={[{ required: true, message: '请输入意图内容' }]}
          >
            <TextArea
              rows={6}
              placeholder="输入 ParaNet DSL 代码或自然语言描述"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default Intent
