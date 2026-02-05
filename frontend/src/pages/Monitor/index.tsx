import React from 'react'
import { Card, Space, Typography, Empty } from 'antd'
import { MonitorOutlined } from '@ant-design/icons'

const { Title } = Typography

const Monitor: React.FC = () => {
  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={2}>监控中心</Title>
      </div>

      <Card>
        <Empty
          image={<MonitorOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
          description="暂无监控数据，部署配置后将开始采集遥测数据"
        />
      </Card>
    </Space>
  )
}

export default Monitor
