import React from 'react'
import { Card, Button, Space, Typography, Empty } from 'antd'
import { PlusOutlined, DeploymentUnitOutlined } from '@ant-design/icons'

const { Title } = Typography

const Topology: React.FC = () => {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>拓扑管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          创建拓扑
        </Button>
      </div>

      <Card>
        <Empty
          image={<DeploymentUnitOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
          description="暂无拓扑数据，点击上方按钮创建您的第一个网络拓扑"
        >
          <Button type="primary" icon={<PlusOutlined />}>
            立即创建
          </Button>
        </Empty>
      </Card>
    </Space>
  )
}

export default Topology
