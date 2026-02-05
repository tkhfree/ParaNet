import React from 'react'
import { Card, Space, Typography, Empty } from 'antd'
import { CloudUploadOutlined } from '@ant-design/icons'

const { Title } = Typography

const Deploy: React.FC = () => {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>部署管理</Title>
      </div>

      <Card>
        <Empty
          image={<CloudUploadOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
          description="暂无部署记录，完成意图编译后即可开始部署"
        />
      </Card>
    </Space>
  )
}

export default Deploy
